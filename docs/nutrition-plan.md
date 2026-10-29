# Fuel: nutrition plan CSV

Fuel is the meals and groceries side of Apex. Press **Fuel** (the yellow switch
in the sidebar, or at the top on a phone) and it grows out of the button; press
**Train** to go back. It has three pages:

- **Meals:** today's meals with calories and protein, carbs and fat for each, the
  day's totals against its target, and a tick for each meal you've eaten.
- **Groceries:** the list for one shopping trip, grouped by aisle, with a tick
  for each item in the cart. It opens on today's trip or the next one. Swipe or
  use the arrows to see other trips.
- **Plan:** the whole plan as a calendar (planned calories per day, shopping days
  marked), each day's meals when you tap it, and **Plan files**, where you load
  CSVs and download the template.

Guests keep the plan and ticks in the browser. Signed-in riders sync them
(table `nutrition_plans`; run `supabase/schema.sql` again to add it).

## Shopping days come from the CSV

Apex doesn't decide when you shop. **The dates of the `Grocery` rows are your
shopping days.** Each trip feeds the days from its date up to the day before the
next trip, or up to `Covers_Through` when a row sets it. So you choose the
interval (every Sunday, Sunday and Wednesday, every 4 days, and so on) when you
ask for the plan, and the file carries it.

## Format

One CSV, one row per meal, grocery item or daily target. `Type` tells them
apart. Columns can be in any order; unknown columns are ignored. Meals and
groceries can also be two files loaded together: they're joined into one plan.

| Column | Used by | Meaning |
|---|---|---|
| `Type` | all | `Meal` (the default when blank), `Grocery` or `Target` |
| `Date` | all | `YYYY-MM-DD`. Meal: the day it's eaten. Grocery: the shopping day. Target: the day it applies to; leave it blank for the default target |
| `Meal` | Meal | `Breakfast`, `Lunch`, `Snack`, `Dinner`, `Pre-ride`, `Post-ride`… Meals are listed in file order |
| `Time` | Meal | Optional, e.g. `07:00` |
| `Name` | Meal, Grocery | The dish, or the item to buy (`Item` works too) |
| `Ingredients` | Meal | Separated by semicolons: `rolled oats 90 g; banana 1` |
| `Calories` | Meal, Target | kcal for the meal, or the day's goal |
| `Protein_g`, `Carbs_g`, `Fat_g` | Meal, Target | Grams |
| `Fiber_g`, `Sodium_mg` | Meal | Optional |
| `Quantity`, `Unit` | Grocery | How much to buy: `600` `g`, `6` `each`, `1` `bag` |
| `Category` | Grocery | The aisle. Lists follow walking order: Produce, Bakery, Meat & Fish, Dairy, Deli, Pantry, Snacks, Drinks, Frozen, Supplements, Household, then anything else |
| `Covers_Through` | Grocery | Optional last day this trip feeds |
| `Notes` | all | Shown under the meal or item |

```csv
Type,Date,Meal,Time,Name,Ingredients,Calories,Protein_g,Carbs_g,Fat_g,Fiber_g,Sodium_mg,Quantity,Unit,Category,Covers_Through,Notes
Target,,,,,,2640,150,330,80,,,,,,,Default: moderate training day
Target,2026-11-04,,,,,3160,160,450,80,,,,,,,Long ride: carbs up
Meal,2026-11-02,Breakfast,07:00,Overnight oats,rolled oats 90 g; Greek yogurt 150 g; blueberries 100 g,634,32,95,14,11,120,,,,,
Meal,2026-11-02,Dinner,19:00,"Salmon, potatoes, greens",salmon 180 g; baby potatoes 300 g; green beans 150 g,662,42,65,26,8,300,,,,,
Grocery,2026-11-01,,,Blueberries,,,,,,,,300,g,Produce,,
Grocery,2026-11-01,,,Salmon fillets,,,,,,,,180,g,Meat & Fish,,
```

The full week to start from is
[`apex-athlete/samples/nutrition-plan-template.csv`](../apex-athlete/samples/nutrition-plan-template.csv),
also under **Plan files → Template** in the app.

Loading a new file replaces the plan and clears the ticks.

## Prompt to generate a plan

Paste this into an assistant along with your training plan CSV, and fill in the
brackets. The shopping line is the one that sets your shopping days.

```text
Write me a nutrition plan as a CSV for Apex.

- Dates: [2026-11-02] to [2026-11-29].
- Me: [age], [sex], [height], [weight], goal [hold weight / lose 0.25 kg a week].
- Training: use the attached training plan CSV. Match carbs to each day's load:
  more on long and hard days, less on rest days, with pre-ride and post-ride
  meals on training days and on-bike fueling in the Notes.
- Food: [preferences, allergies, foods to avoid], [cooking time on weekdays],
  [batch cooking is fine / not].
- Shopping: I shop [every Sunday and Wednesday]. Put a Grocery row for every
  item I need on each shopping day, with the total quantity for the meals up to
  the next shopping day, in units a store sells (pack, bag, g, each). Staples
  that last longer go on the first trip only.

Output only the CSV, with exactly these columns:
Type,Date,Meal,Time,Name,Ingredients,Calories,Protein_g,Carbs_g,Fat_g,Fiber_g,Sodium_mg,Quantity,Unit,Category,Covers_Through,Notes

Rules:
- Type is Meal, Grocery or Target. Dates are YYYY-MM-DD.
- One Target row with a blank Date for my default day, plus one dated Target row
  for each day that differs (long rides, races, rest days).
- Meal rows: Meal, Time, Name, Ingredients (separated by semicolons, with
  amounts), Calories and grams of protein, carbs and fat. Calories should equal
  4 × protein + 4 × carbs + 9 × fat, and each day's meals should add up to
  within 5% of that day's target.
- Grocery rows: Name, Quantity, Unit, Category (Produce, Bakery, Meat & Fish,
  Dairy, Pantry, Frozen, Supplements). Dated on the shopping day.
- Quote any field that contains a comma.
```
