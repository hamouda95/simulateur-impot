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
