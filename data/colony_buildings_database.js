/**
 * Space Age Colony building database.
 * Sources: forgeofempires.fandom.com / en.wiki.forgeofempires.com
 *
 * Fields per building:
 *   name         – display name
 *   width/height – footprint in grid cells
 *   type         – 'townhall' | 'residential' | 'goods' | 'lifesupport'
 *   color        – hex fill color
 *   needsRoad    – 0 = no road required, 1 = road required
 *   colonyType   – matches COLONY_TYPES[].id
 *   age          – display label
 */

const RES  = '#7EC8E3'; // blue-teal residential
const GOOD = '#F4CD6B'; // yellow goods
const LIFE = '#7DC87D'; // green life support
const TH   = '#E8D679'; // gold town hall

export const COLONY_BUILDINGS = {

    // ── Mars ──────────────────────────────────────────────────────────────────
    'C_Mars_TH': {
        name: 'Mars Spaceport', width: 6, height: 6,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    // Residential
    'C_Mars_DropPod': {
        name: 'Drop Pod', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_SimpleShelter': {
        name: 'Simple Shelter', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_ModularHome': {
        name: 'Modular Home', width: 5, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_Dome': {
        name: 'Dome', width: 4, height: 5,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    // Goods
    'C_Mars_BioTechFarm': {
        name: 'BioTech Farm', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_MicrobeResearchLab': {
        name: 'Microbe Research Lab', width: 4, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_SurfaceDrill': {
        name: 'Surface Drill', width: 4, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_ChemicalMillingFacility': {
        name: 'Chemical Milling Facility', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_FusionPlant': {
        name: 'Fusion Plant', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    // Life Support
    'C_Mars_OxygenGenerator': {
        name: 'Oxygen Generator', width: 1, height: 1,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_SolarPanelE': {
        name: 'Solar Panel (E)', width: 2, height: 1,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_SolarPanelS': {
        name: 'Solar Panel (S)', width: 1, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_RecombinationMachine': {
        name: 'Recombination Machine', width: 2, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_RefinementStation': {
        name: 'Refinement Station', width: 3, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },
    'C_Mars_AutonomousFoodDispenser': {
        name: 'Autonomous Food Dispenser', width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'mars', age: 'Space Age Mars',
    },

    // ── Asteroid Belt ─────────────────────────────────────────────────────────
    'C_AB_TH': {
        name: 'Asteroid Belt HQ', width: 7, height: 6,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    // Residential
    'C_AB_MovableAbode': {
        name: 'Movable Abode', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_DeepSeatedHousing': {
        name: 'Deep-Seated Housing', width: 2, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_VaultHouse': {
        name: 'Vault House', width: 4, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_SpaceviewResidence': {
        name: 'Spaceview Residence', width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    // Goods
    'C_AB_BromePump': {
        name: 'Bromine Pump', width: 4, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_NickelExcavator': {
        name: 'Nickel Excavator', width: 6, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_PlatinumQuarry': {
        name: 'Platinum Quarry', width: 5, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_AsteroidDrill': {
        name: 'Asteroid Drill', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    // Life Support
    'C_AB_StorageContainer': {
        name: 'Storage Container', width: 2, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_FuelTank': {
        name: 'Fuel Tank', width: 3, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_UndergroundReactor': {
        name: 'Underground Reactor', width: 2, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },
    'C_AB_SpaceWharf': {
        name: 'Space Wharf', width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'asteroid_belt', age: 'Space Age Asteroid Belt',
    },

    // ── Venus ─────────────────────────────────────────────────────────────────
    'C_Venus_TH': {
        name: 'Venus Colony HQ', width: 5, height: 5,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    // Residential
    'C_Venus_FloatingShelter': {
        name: 'Floating Shelter', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_InflatableHome': {
        name: 'Inflatable Home', width: 3, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_AdvancedApartment': {
        name: 'Advanced Apartment', width: 3, height: 4,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_MultipurposeProperty': {
        name: 'Multipurpose Property', width: 5, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    // Goods
    'C_Venus_SoyFarm': {
        name: 'Soy Farm', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_MicrogreenCapsules': {
        name: 'Microgreen Capsules', width: 4, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_HerbGarden': {
        name: 'Herb Garden', width: 6, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_SugarcanePlantation': {
        name: 'Sugarcane Plantation', width: 5, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_SeaweedFarm': {
        name: 'Seaweed Farm', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    // Life Support
    'C_Venus_GasTank': {
        name: 'Gas Tank', width: 2, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_MaintenanceShip': {
        name: 'Maintenance Ship', width: 2, height: 3,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_CargoPlatform': {
        name: 'Cargo Platform', width: 4, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'venus', age: 'Space Age Venus',
    },
    'C_Venus_GasStation': {
        name: 'Gas Station', width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'venus', age: 'Space Age Venus',
    },

    // ── Jupiter Moon ──────────────────────────────────────────────────────────
    'C_JM_TH': {
        name: 'Jupiter Moon HQ', width: 5, height: 5,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    // Residential
    'C_JM_AquaPod': {
        name: 'Aqua Pod', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_AquaCabin': {
        name: 'Aqua Cabin', width: 2, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_AutonomousChambers': {
        name: 'Autonomous Chambers', width: 4, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_AquariusHabitat': {
        name: 'Aquarius Habitat', width: 3, height: 5,
        type: 'residential', color: RES, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    // Goods
    'C_JM_RedAlgaeFarm': {
        name: 'Red Algae Farm', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_Oceanarium': {
        name: 'Oceanarium', width: 4, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_Adventurer': {
        name: 'Adventurer', width: 6, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_SpongeFarm': {
        name: 'Sponge Farm', width: 4, height: 6,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_ResearchLaboratory': {
        name: 'Research Laboratory', width: 6, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    // Life Support
    'C_JM_OxygenConcentrator': {
        name: 'Oxygen Concentrator', width: 2, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_OrganicOxidator': {
        name: 'Organic Oxidator', width: 3, height: 2,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_DeepAquamarine': {
        name: 'Deep Aquamarine', width: 2, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },
    'C_JM_HydrographicHub': {
        name: 'Hydrographic Hub', width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'jupiter_moon', age: 'Space Age Jupiter Moon',
    },

    // ── Titan ─────────────────────────────────────────────────────────────────
    // Note: NO roads required
    'C_Titan_TH': {
        name: 'Titan Colony HQ', width: 5, height: 5,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    // Residential
    'C_Titan_Igloo': {
        name: 'Igloo', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_HeatedResidence': {
        name: 'Heated Residence', width: 3, height: 4,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_ScreenedDomicile': {
        name: 'Screened Domicile', width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    // Goods
    'C_Titan_MatterCompressionReactor': {
        name: 'Matter Compression Reactor', width: 6, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_MoleculeDrill': {
        name: 'Molecule Drill', width: 4, height: 6,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_ExperimentalTestSite': {
        name: 'Experimental Test Site', width: 4, height: 5,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_PurificationFacility': {
        name: 'Purification Facility', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_ChemicalCleaningPlant': {
        name: 'Chemical Cleaning Plant', width: 6, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    // Life Support
    'C_Titan_HeatBatteries': {
        name: 'Heat Batteries', width: 3, height: 3,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_HotChocolateBar': {
        name: 'Hot Chocolate Bar', width: 3, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },
    'C_Titan_SpicyTitanRestaurant': {
        name: 'Spicy Titan Restaurant', width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'titan', age: 'Space Age Titan',
    },

    // ── Space Hub ─────────────────────────────────────────────────────────────
    // Note: NO roads required
    'C_SH_TH': {
        name: 'Space Hub HQ', width: 5, height: 5,
        type: 'townhall', color: TH, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    // Residential
    'C_SH_SimpleCrewQuarters': {
        name: 'Simple Crew Quarters', width: 3, height: 2,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_EnhancedCrewQuarters': {
        name: 'Enhanced Crew Quarters', width: 4, height: 3,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_OfficersQuarters': {
        name: "Officers' Quarters", width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    // Goods
    'C_SH_CrystalCrafter': {
        name: 'Crystal Crafter', width: 4, height: 5,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_PhotonsphereHarvester': {
        name: 'Photonsphere Harvester', width: 5, height: 5,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_AeroFusionPlant': {
        name: 'AeroFusion Plant', width: 5, height: 5,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_DeepSpaceDataConverter': {
        name: 'Deep Space Data Converter', width: 5, height: 5,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_FMMManufacture': {
        name: 'F.M.M. Manufacture', width: 5, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    // Life Support
    'C_SH_FloraShipExpress': {
        name: 'FloraShip Express', width: 3, height: 3,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_CosmicCleanExpress': {
        name: 'CosmicClean Express', width: 4, height: 3,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
    'C_SH_SitnEatSpacePizza': {
        name: "Sit'n'Eat SpacePizza", width: 4, height: 4,
        type: 'lifesupport', color: LIFE, needsRoad: 0,
        colonyType: 'space_hub', age: 'Space Age Space Hub',
    },
};
