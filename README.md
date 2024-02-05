### Routes

- GET `/recipes` - Récupérer toutes les recettes
- DELETE `/recipes/:recipeId/delete` - Supprimer une recette et ses informations
- GET `/recipes/no-allergy/:allergyId` - Récupérer les recettes sans allergie
- GET `/recipes/goal/:goalId` - Get recipes by goal
- GET `/recipes/:recipeId` - Récupérer une recette avec son ID
- GET `/recipes/cuisine/:cuisineId` - Récuperer les recettes d'une cuisine
- POST `/cuisines/add` - Ajouter une cuisine
  - Body : `{name: String}`
- POST `/recipes/add` - Ajouter une recette

  - Body:

  ```json
  {
    "recipe_name": "Nems au poulet",
    "recipe_description": "Classic chicken nems with spices",
    "image_url": "https://www.cookomix.com/wp-content/uploads/2017/02/nems-au-poulet-thermomix.jpg",
    "cuisine_id": "6",
    "goal_name": "Special Occasion",
    "dietary_info_names": ["High Protein", "Rich Fibers"],
    "allergies_info_names": ["Dairy Allergy"],
    "ingredients_data": [
      {
        "ingredient_id": 11,
        "quantity": 1
      }
    ],
    "instructions": [
      {
        "step_number": 1,
        "StepInstruction": "Cook the chicken."
      },
      {
        "step_number": 2,
        "StepInstruction": "Season it with onions."
      }
    ]
  }
  ```

- PUT `/recipes/:recipeId/update` - Modifier une recette

  - Body:
    ```json
    {
      "recipe_name": "Nems au poulet et oignons",
      "recipe_description": "Description mise à jour",
      "goal_id": 4,
      "cuisine_id": 6
    }
    ```

- POST `/recipes/:recipeId/add/ingredients`- Ajouter un ingrédient à une liste

  - Body:

    ```json
    {
      "name": "Chicken Breast",
      "quantity": 200,
      "unit": "kilograms"
    }
    ```

- DELETE `/recipes/:recipeId/ingredients/:ingredientId/delete` - Supprimer un ingrédient d'une recette

- PUT `/recipes/:recipeId/instructions/:stepNumber/update` - Modifier un instruction d'une recette

  - Body :

  ```json
  { "StepInstruction": "Season it with onions." }
  ```

- DELETE `/recipes/:recipeId/instructions/:instructionId/delete` - Supprimer une instruction d'une recette

- DELETE `/cuisines/:cuisineId/delete` - Supprimer une recette et remplacer par International

  - Body :

  ```json

  ```
