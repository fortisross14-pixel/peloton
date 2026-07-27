# Rider Identity and Race Specialty Update

## Immutable rider identity

The following fields are assigned when a rider is created and never change during the career:

- Rarity
- Base skills
- Base overall rating
- Terrain profile
- Race-duration specialty

Annual performance is calculated separately from identity:

- Career phase: 80% first year, 90% second year, 100% prime, then veteran decline
- Annual shape: 95% to 105%
- Career momentum: 98% to 102%, with gradual year-to-year movement
- Current stamina

Existing saves are migrated automatically. Their current rarity and base skills become their permanent identity from that point forward.

## Two independent specialties

### Terrain profile

- Climber
- Sprinter
- Rouleur
- Puncheur
- All-rounder

This determines which terrain suits the rider.

### Race-duration specialty

- Classics specialist
- One-week specialist
- Grand Tour specialist

This determines where the rider receives a duration bonus. A classics rouleur is especially dangerous at Roubaix, while a Grand Tour climber is especially dangerous in a mountain-heavy Giro. A rider with the wrong duration specialty can still win stages or races through superior talent, form, terrain fit, and race noise.

## Elite generation

Riders are no longer promoted or demoted to control rarity counts. Retiring elite riders are replaced by newly generated elite rookies.

- 3-4 active Legends
- 0-2 active Generational riders
- Never more than 2 active Generational riders
- Long-run simulations keep roughly half of seasons without a Generational rider

## Simulation validation

Latest balancing test: 24 universes, 8 seasons each, 192 total seasons.

- Rider identity changes after creation: 0
- Annual shape observed: 95.0%-105.0%
- Career momentum observed: 98.0%-102.0%
- Active Legends: always 3-4
- Active Generational riders: always 0-2
- Cobbled classics won by rouleurs: 66.0%
- Hilly classics won by puncheurs: 50.0%
- Mountain classics won by climbers: 70.8%
- Classics/Monuments won by Classics specialists: about 62%
- One-week races won by One-week specialists: 47.3%
- Grand Tours won by Grand Tour specialists: 57.1%
- Same rider won all three Grand Tours: 8.9% of seasons
- Highest Grand Tour career in this sample: 13 wins
