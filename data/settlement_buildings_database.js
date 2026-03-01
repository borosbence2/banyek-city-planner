/**
 * Cultural Settlement building database.
 * Sources: Forge of Empires Wiki (forgeofempires.fandom.com)
 *
 * Fields per building:
 *   name          – English display name
 *   width/height  – footprint in grid cells
 *   type          – 'townhall' | 'residential' | 'goods' | 'culture'
 *   color         – hex fill color
 *   needsRoad     – 0 = no road required, 1 = road required
 *   settlementType – settlement ID key (matches SETTLEMENT_TYPES[].id)
 *   age           – settlement display label (for building list grouping)
 *
 * Note: Pirates building sizes are approximate (added Nov 2025, limited data).
 * Mughal diplomacy chain/set building sizes are estimated.
 */

const RES  = '#87CEEB';
const GOOD = '#F4E16B';
const CULT = '#6B8E7F';
const TH   = '#E8D679';

export const SETTLEMENT_BUILDINGS = {

    // ── Vikings ──────────────────────────────────────────────────────────────
    'S_Vikings_Embassy': {
        name: 'Viking Embassy', width: 4, height: 3,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_Shack': {
        name: 'Shack', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_Hut': {
        name: 'Hut', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_ClanHouse': {
        name: 'Clan House', width: 3, height: 5,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_AxeSmith': {
        name: 'Axe Smith', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_MeadBrewery': {
        name: 'Mead Brewery', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_BeastHunter': {
        name: 'Beast Hunter', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_WoolFarm': {
        name: 'Wool Farm', width: 5, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_Runestone': {
        name: 'Runestone', width: 1, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_ClanTotem': {
        name: 'Clan Totem', width: 1, height: 2,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_Shrine': {
        name: 'Shrine', width: 2, height: 2,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_Market': {
        name: 'Market', width: 3, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },
    'S_Vikings_OldWillow': {
        name: 'Old Willow', width: 2, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'vikings', age: 'Vikings',
    },

    // ── Feudal Japan ─────────────────────────────────────────────────────────
    'S_Japan_Embassy': {
        name: 'Japanese Embassy', width: 3, height: 4,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_GasshoHut': {
        name: 'Gasshō-zukuri Hut', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_ShoinHouse': {
        name: 'Shoin-zukuri House', width: 2, height: 4,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_ShindenManor': {
        name: 'Shinden-Zukuri Manor', width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_SoyBeanField': {
        name: 'Soy Bean Field', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_Gallery': {
        name: 'Gallery', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_Armorer': {
        name: 'Armorer', width: 4, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_InstrumentWorkshop': {
        name: 'Instrument Workshop', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_Toro': {
        name: 'Tōrō', width: 1, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_ShintoShrine': {
        name: 'Shinto Shrine', width: 2, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_ToriiGate': {
        name: 'Decorated Torii Gate', width: 3, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },
    'S_Japan_SacredToriiGate': {
        name: 'Sacred Torii Gate', width: 1, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'feudal_japan', age: 'Feudal Japan',
    },

    // ── Ancient Egypt ─────────────────────────────────────────────────────────
    'S_Egypt_Embassy': {
        name: 'Egyptian Embassy', width: 6, height: 8,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_SimpleClayHut': {
        name: 'Simple Clay Hut', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_MultiStoryHouse': {
        name: 'Multi-Story Clay House', width: 3, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_ResidentialBlock': {
        name: 'Residential Block', width: 3, height: 5,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_LuxuryEstate': {
        name: 'Luxury Estate', width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_GrainFarm': {
        name: 'Grain Farm', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_Pottery': {
        name: 'Pottery', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_FlowerFarm': {
        name: 'Flower Farm', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_PlaceOfPrayer': {
        name: 'Place of Prayer', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_PottedPlant': {
        name: 'Potted Plant', width: 1, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_CultivatedPalmsN': {
        name: 'Cultivated Palms (N)', width: 1, height: 2,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_CultivatedPalmsE': {
        name: 'Cultivated Palms (E)', width: 2, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_DecoratedPalmN': {
        name: 'Decorated Palm Gardens (N)', width: 1, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },
    'S_Egypt_DecoratedPalmE': {
        name: 'Decorated Palm Gardens (E)', width: 3, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'egypt', age: 'Ancient Egypt',
    },

    // ── Aztecs ────────────────────────────────────────────────────────────────
    'S_Aztecs_Embassy': {
        name: 'Aztec Embassy', width: 5, height: 5,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_MacehualtinHut': {
        name: 'Macehualtin Hut', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_YaoteguihuaResidence': {
        name: 'Yaoteguihua Residence', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_PipiltinPalace': {
        name: 'Pipiltin Palace', width: 5, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_VegetableGarden': {
        name: 'Vegetable Garden', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_QuetzalAviary': {
        name: 'Quetzal Aviary', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_MaizeFarm': {
        name: 'Maize Farm', width: 3, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_StoneCarver': {
        name: 'Stone Carver', width: 4, height: 4,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_HonoringSculpture': {
        name: 'Honoring Sculpture', width: 1, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_DecorativeStatue': {
        name: 'Decorative Statue', width: 1, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'aztecs', age: 'Aztecs',
    },
    'S_Aztecs_OrnamentalStatue': {
        name: 'Ornamental Statue', width: 3, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'aztecs', age: 'Aztecs',
    },

    // ── Mughal Empire ─────────────────────────────────────────────────────────
    'S_Mughal_Embassy': {
        name: 'Mughal Embassy', width: 9, height: 6,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_Bhavan': {
        name: 'Bhavan', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_ShantiGhar': {
        name: 'Shanti Ghar', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_Haveli': {
        name: 'Haveli', width: 4, height: 3,
        type: 'residential', color: RES, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_RicePaddy': {
        name: 'Rice Paddy', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_SareeWeaver': {
        name: 'Saree Weaver', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_SpiceTrader': {
        name: 'Spice Trader', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_LotusFlowersFarm': {
        name: 'Lotus Flowers Farm', width: 3, height: 5,
        type: 'goods', color: GOOD, needsRoad: 1,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    // Chain diplomacy (connect to embassy front/sides)
    'S_Mughal_Alley': {
        name: 'Alley', width: 1, height: 2,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_WaterCanal': {
        name: 'Water Canal', width: 2, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    // Set diplomacy buildings (sizes estimated)
    'S_Mughal_Chhatri': {
        name: 'Chhatri', width: 2, height: 2,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_Baldachin': {
        name: 'Baldachin', width: 2, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },
    'S_Mughal_Charbagh': {
        name: 'Charbagh', width: 4, height: 4,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'mughal', age: 'Mughal Empire',
    },

    // ── Polynesia ─────────────────────────────────────────────────────────────
    // Note: NO roads required in this settlement
    'S_Polynesia_Embassy': {
        name: 'Polynesian Embassy', width: 3, height: 4,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_SmallHut': {
        name: 'Small Hut', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_PileDwelling': {
        name: 'Pile Dwelling', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_FamilyHut': {
        name: 'Family Hut', width: 4, height: 4,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_RahuiFisher': {
        name: 'Rahui Fisher', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_PalmGarden': {
        name: 'Palm Garden', width: 4, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_KavaFarm': {
        name: 'Kava Farm', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_CatamaranBuilder': {
        name: 'Catamaran Builder', width: 4, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_MaskedTotem': {
        name: 'Masked Totem', width: 1, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_DanceStage': {
        name: 'Dance Stage', width: 2, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_MelodicStatue': {
        name: 'Melodic Statue', width: 3, height: 1,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_StatueOfMusic': {
        name: 'Statue of Music', width: 1, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },
    'S_Polynesia_CommunalCookingArea': {
        name: 'Communal Cooking Area', width: 3, height: 4,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'polynesia', age: 'Polynesia',
    },

    // ── Pirates ───────────────────────────────────────────────────────────────
    // Note: NO roads required · Building sizes are approximate (limited data)
    'S_Pirates_Embassy': {
        name: 'Pirate Flagship', width: 5, height: 4,
        type: 'townhall', color: TH, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_HammockPlace': {
        name: 'Hammock Place', width: 2, height: 2,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_SmallShed': {
        name: 'Small Shed', width: 2, height: 3,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_Barrack': {
        name: 'Barrack', width: 3, height: 3,
        type: 'residential', color: RES, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_SmallPier': {
        name: 'Small Pier', width: 2, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_LongPier': {
        name: 'Long Pier', width: 1, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_WidePier': {
        name: 'Wide Pier', width: 3, height: 2,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_Fisherman': {
        name: 'Fisherman', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_RumDistillery': {
        name: 'Rum Distillery', width: 3, height: 4,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_SpiceMarket': {
        name: 'Spice Market', width: 3, height: 3,
        type: 'goods', color: GOOD, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_SmallCutter': {
        name: 'Small Cutter', width: 2, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_CannonBuilder': {
        name: 'Cannon Builder', width: 4, height: 3,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_RedSailedBrig': {
        name: 'Red Sailed Brig', width: 3, height: 4,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
    'S_Pirates_BlackwaterGalleon': {
        name: 'Blackwater Galleon', width: 5, height: 4,
        type: 'culture', color: CULT, needsRoad: 0,
        settlementType: 'pirates', age: 'Pirates',
    },
};
