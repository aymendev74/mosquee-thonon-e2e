# Tests e2e — mosquée Thonon

Suite Playwright couvrant le parcours critique de l'application : ouverture des inscriptions,
création d'une inscription enfant, d'une inscription adulte et d'une adhésion, connexion
administrateur et modification d'une inscription existante.

## Prérequis

Le back-end et le front-end doivent tourner et pointer sur la même base :

```powershell
# back — JDK 18 requis (Lombok 1.18.28 ne compile pas sous le JDK 25)
cd "..\mosquee-thonon-back" ; .\mvnw spring-boot:run     # http://localhost:8080/api
cd "..\mosquee-thonon-front-2" ; npm start               # http://localhost:3000
```

Renseigner ensuite `.env` (non versionné) :

```
E2E_BASE_URL=http://localhost:3000
E2E_API_BASE_URL=http://localhost:8080/api
E2E_USER=<identifiant d'un compte ROLE_ADMIN>
E2E_PASSWORD=<mot de passe>
```

Le compte doit porter `ROLE_ADMIN` : le setup écrit les paramètres applicatifs et crée au besoin
une période tarifaire, deux opérations réservées aux administrateurs.

## Lancer les tests

```powershell
npm test              # suite complète (setup -> tests -> nettoyage)
npm run test:setup    # préparation seule, utile pour vérifier l'environnement
npm run test:ui       # mode interactif
npm run report        # dernier rapport HTML
npm run typecheck     # vérification TypeScript
```

## Ce que la suite fait à l'environnement

Les tests s'exécutent sur l'environnement pointé par `E2E_BASE_URL` : base de dev en local,
staging en CI. **Ne jamais les pointer sur la production.**

Le projet `setup` prépare l'environnement, car sans ces prérequis les formulaires publics ne
s'affichent même pas :

| Étape | Action |
|---|---|
| Paramètres | Ouvre les inscriptions enfant et adulte, désactive la priorité aux réinscriptions, **coupe l'envoi d'e-mails** |
| Périodes | Crée une période `COURS_ENFANT` et `COURS_ADULTE` couvrant le jour courant **si aucune n'existe** |
| Tarifs | Renseigne la grille tarifaire de ces périodes **si elle est vide** |
| Adhésion | Vérifie qu'au moins un tarif `ADHESION` existe (il ne peut pas être créé automatiquement) |

Les étapes sont idempotentes : rien n'est écrasé si l'environnement est déjà correctement
configuré. La préparation passe par l'API plutôt que par les écrans d'administration — saisir une
période et seize montants à chaque run serait long et fragile pour un simple prérequis. La
vérification de l'écran Paramètres, elle, reste un test d'interface (`parametres.spec.ts`).

Le projet `cleanup`, déclaré en `teardown` du setup, s'exécute **même si des tests échouent** :

- suppression des inscriptions et adhésions créées (toutes préfixées `E2E-`, ce qui ramasse aussi
  les résidus d'un run précédent interrompu) ;
- suppression des comptes utilisateurs créés au passage par les inscriptions, reconnus à la forme
  stricte `e2e-<role>-<suffixe>@example.com` — domaine réservé par la RFC 2606, donc aucun compte
  réel ne peut être emporté ;
- restauration des quatre paramètres applicatifs à leur valeur d'avant-run.

Supprimer une inscription purge aussi ses demandes de mail (`deleteByTypeAndBusinessIdIn` dans
`InscriptionServiceImpl` / `AdhesionServiceImpl`), et le job de mail vide toute la file à chaque
cycle en basculant les demandes en `IGNORED` — statut terminal — tant que l'envoi est coupé.
Réactiver le paramètre plus tard ne peut donc pas faire repartir d'anciens mails.

## Effets de bord connus

- Pendant la durée du run, l'envoi d'e-mails est coupé pour **tout l'environnement** : les demandes
  de mail émises entre-temps, y compris celles qui ne viennent pas des tests, passent en `IGNORED`
  et ne partiront jamais. C'est le seul effet irréversible de la suite.
- Les périodes créées par le setup ne sont pas supprimées : ce sont des données de référence.
- Deux runs simultanés sur le même environnement se disputeraient les paramètres globaux. Le
  workflow CI les sérialise via un groupe `concurrency`.

## Conventions de sélecteurs

`testIdAttribute` vaut `testid` (et non `data-testid`). Côté front, les composants
`src/components/common/*FormItem.tsx` posent automatiquement `testid = name` sur le champ :

| Composant | Sélecteur |
|---|---|
| `InputFormItem`, `SelectFormItem`, `SwitchFormItem` | `getByTestId("<name>")` |
| `InputNumberFormItem` | `getByTestId("<name>")` cible le wrapper — descendre sur `input` |
| `RadioGroupFormItem`, `MultiTagSelect` | `getByTestId("<name>-<valeur>")` |
| `DatePickerFormItem` | pas de `testid` — cibler l'`id` DOM : `page.locator("#<name>")` |

Ces pièges sont encapsulés dans `tests/helpers/antd.ts` : utiliser ces helpers plutôt que de
piloter antd directement.

## Authentification dans les tests

Tout ce qui a besoin d'un administrateur appelle `seConnecterAdmin(page)`, qui se connecte par
l'interface — donc via le vrai flux OAuth2/PKCE — et renvoie `page.request`, le contexte API du
navigateur. Ce contexte partage le stockage de cookies avec la page et porte donc la session.

Ne pas revenir à un `storageState` réinjecté dans un `request.newContext()` : sur staging, ce
transfert n'a transmis aucun cookie et tous les appels API partaient en 401, alors que la
connexion dans le navigateur, elle, fonctionnait. Une seule mécanique d'authentification, celle
que l'application utilise réellement.

Corollaire : les appels API se construisent avec `urlApi()` (URL absolue), car la `baseURL` du
contexte navigateur est celle du front, pas celle de l'API.

### `E2E_BASE_URL` et `E2E_API_BASE_URL` doivent viser le même hôte

Les cookies de session sont posés sur l'hôte que l'application utilise réellement — qui n'est pas
forcément celui par lequel on entre. Sur staging, la redirection OAuth bascule l'application sur
le sous-domaine `www` : entrer par `https://staging.inscription-amc.fr` fait atterrir les cookies
sur `www.staging.inscription-amc.fr`. Si `E2E_API_BASE_URL` vise l'apex, aucun cookie n'est
transmis à l'API et **tous les appels authentifiés répondent 401**, alors que la connexion dans
le navigateur fonctionne et que les endpoints publics répondent 200 — un symptôme très peu
parlant.

`seConnecterAdmin` compare donc les deux hôtes après connexion et échoue avec un message
explicite en cas d'écart. Les cookies ignorant le port, la comparaison porte sur le nom d'hôte :
front et API peuvent cohabiter sur `localhost` avec des ports différents.
