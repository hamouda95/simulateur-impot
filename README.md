# Simulateur d'impôt sur le revenu
Application web statique en français (HTML, CSS, JavaScript), sans serveur ni base de données.

## Fonctionnalités
- Foyer fiscal et quotient familial indicatif
- Revenus 2024, 2025 et simulation provisoire 2026
- Saisie des salaires et lecture locale des fiches de paie PDF
- Dons, emploi à domicile, garde d'enfants, prélèvement à la source
- Interface responsive avec thème clair/sombre automatique

## Installation
Ouvrir `index.html` dans un navigateur. Une connexion Internet est nécessaire au chargement de PDF.js depuis cdnjs.

## Render
Créer un Static Site relié à ce dépôt avec branche `main`, Build Command `echo ready`, Publish Directory `.`, Auto Deploy activé.

## Avertissement
Calcul non officiel et **partiel** : décote, cas particuliers, plafonnements et dépenses spécifiques non exhaustifs. Vérifier les barèmes et résultats auprès d'impots.gouv.fr avant toute décision. Aucune fiche de paie n'est téléversée par le code de cette application, et aucun fichier personnel ne doit être ajouté au dépôt.

## Espace familial (en cours d'activation)
L'interface de connexion Google, familles, rôles, invitations par lien/QR et sauvegarde est intégrée, mais **non opérationnelle tant qu'un backend Supabase n'est pas configuré**. Le simulateur public reste utilisable sans compte.

### Configuration
1. Créer un projet Supabase (région européenne de préférence), puis exécuter `supabase/schema.sql` dans SQL Editor sur un environnement de test et vérifier les politiques RLS.
2. Dans Supabase Authentication > Providers, activer Google. Configurer l'application OAuth Google avec les URL de redirection exactes fournies par Supabase.
3. Dans Authentication > URL Configuration, déclarer `https://simulateur-impot-2026.onrender.com` comme Site URL et l'URL correspondante dans Redirect URLs.
4. Remplir `family-config.js` avec **Project URL** et **clé publique anon/publishable** uniquement. Ne jamais publier de service_role, de clé secrète ou de mot de passe.
5. Tester avec deux comptes Google distincts : création de famille, invitation, demande, approbation, consultation en viewer, modification en editor, gestion en admin, droits owner et révocation.
6. Avant toute mise en production avec de vraies données fiscales, faire auditer les politiques d'accès, tester les cas concurrents d'invitations et définir conservation, suppression, sauvegarde et politique de confidentialité (RGPD).

### Modèle de sécurité
- `owner` : administration et rôles, `admin` : invitations et validation, `editor` : édition des simulations, `viewer` : lecture.
- Les jetons d'invitation sont aléatoires, stockés sous forme de hash SHA-256, valables 24 h par défaut et à usage unique. Une approbation d'admin reste obligatoire.
- RLS activé sur les tables, fonctions privilégiées limitées aux utilisateurs authentifiés. Les utilisateurs ne peuvent pas écrire directement dans les tables de membres ou d'invitations.
- Les PDF ne sont pas stockés ; seule une capture des champs généraux du formulaire est enregistrée, pas les fichiers ni les champs PDF individuels.
- Le QR code contient un lien d'invitation et doit rester privé. Il ne donne pas accès aux données sans connexion et approbation.
- La synchronisation est explicite via « Sauvegarder », pas automatique. Une simulation chargée peut nécessiter une nouvelle saisie de certains champs de déclarant.

**Limites actuelles :** intégration non testée de bout en bout avec un projet Supabase réel. L'authentification et la base de données ne sont pas encore provisionnées. Aucun document fiscal réel ne doit être importé ou sauvegardé dans un espace familial avant validation.
