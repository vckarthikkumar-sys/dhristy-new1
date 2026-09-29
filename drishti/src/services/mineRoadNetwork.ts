import { Position } from '../types';

export interface RoadWaypoint extends Position {
  id: string;
  name?: string;
}

export interface RoadSegment {
  id: string;
  from: string;
  to: string;
  points: Position[];
  width: number;
}

/**
 * Mining Pit Alpha Haul Road Network — Logical Graph & Geometry
 * Accurately mapped from the purple hand-drawn reference lines to the brown/tan
 * dirt haul roads on the aerial satellite terrain (1000x1000 coordinate space).
 *
 * Core Junctions:
 * - NW Access & Fork: (185, 70) -> (295, 240)
 * - Highwall Geotech Rim Loop: (295, 240) <-> (475, 385)
 * - Central Hub 6-Way Intersection: (475, 385)
 * - Northeast Rim & Bench: (475, 385) -> (840, 390) -> (815, 530)
 * - Active Blasting Sector B-2 Haulway: (475, 385) -> (655, 415) -> (815, 530)
 * - Southeast Overburden Exit: (775, 590) -> (970, 730)
 * - Central Pit Dividing Ramps & Cross-Cut: (475, 385) down to (395, 680) & (730, 615)
 * - West Arterial Perimeter: (345, 330) -> (330, 540) -> (345, 755)
 * - Gyratory Crusher & Fuel Depot Loops: (345, 755) <-> (625, 740)
 */

export const MINE_WAYPOINTS: Record<string, RoadWaypoint> = {
  // 1. Northwest Crest & Entrance
  NW_ACCESS_GATE: { id: 'NW_ACCESS_GATE', x: 185, y: 70, name: 'Northwest Access Gate' },
  NW_CREST_1: { id: 'NW_CREST_1', x: 200, y: 120, name: 'NW Crest Bend 1' },
  NW_CREST_2: { id: 'NW_CREST_2', x: 220, y: 170, name: 'NW Crest Bend 2' },
  NW_CREST_3: { id: 'NW_CREST_3', x: 255, y: 215, name: 'NW Crest Approach' },
  NW_FORK: { id: 'NW_FORK', x: 295, y: 240, name: 'Northwest Pit Fork' },

  // 2. Highwall Geotech Hazard (Northwest Pit)
  HIGHWALL_RIM_N: { id: 'HIGHWALL_RIM_N', x: 345, y: 200, name: 'Highwall Upper Crest' },
  HIGHWALL_RIM_NE: { id: 'HIGHWALL_RIM_NE', x: 410, y: 195, name: 'Highwall North Bench' },
  HIGHWALL_RIM_E: { id: 'HIGHWALL_RIM_E', x: 465, y: 215, name: 'Highwall East Apex' },
  HIGHWALL_RIM_SE: { id: 'HIGHWALL_RIM_SE', x: 505, y: 245, name: 'Highwall SE Chute' },
  HIGHWALL_RAMP_MID: { id: 'HIGHWALL_RAMP_MID', x: 495, y: 310, name: 'Highwall Mid Descent' },

  HIGHWALL_RAMP_SW: { id: 'HIGHWALL_RAMP_SW', x: 315, y: 285, name: 'Highwall Lower Incline' },
  HIGHWALL_HAZARD_S: { id: 'HIGHWALL_HAZARD_S', x: 345, y: 330, name: 'Highwall Geotech Hazard Portal' },
  HIGHWALL_RAMP_SE: { id: 'HIGHWALL_RAMP_SE', x: 405, y: 355, name: 'Highwall South Ramp' },

  // 3. Central Hub 6-Way Intersection
  CENTRAL_HUB: { id: 'CENTRAL_HUB', x: 475, y: 385, name: 'Central Haul Hub' },

  // 4. Northeast Sector & Blasting Complex
  NE_RIM_ASCENT: { id: 'NE_RIM_ASCENT', x: 505, y: 315, name: 'NE Rim Incline' },
  NE_BENCH_PASS: { id: 'NE_BENCH_PASS', x: 535, y: 260, name: 'Northeast Bench Pass' },
  NE_RIM_NORTH: { id: 'NE_RIM_NORTH', x: 585, y: 235, name: 'NE Upper Crest North' },
  NE_RIM_APEX: { id: 'NE_RIM_APEX', x: 645, y: 225, name: 'NE Pit Outer Apex' },
  NE_RIM_NE: { id: 'NE_RIM_NE', x: 705, y: 230, name: 'Drilling Bench Spur' },
  NE_RIM_FAR_NE: { id: 'NE_RIM_FAR_NE', x: 755, y: 250, name: 'NE Perimeter Turn' },
  NE_RIM_EAST_1: { id: 'NE_RIM_EAST_1', x: 790, y: 285, name: 'East Rim Upper Ramp' },
  NE_RIM_EAST_2: { id: 'NE_RIM_EAST_2', x: 825, y: 330, name: 'East Rim Loading Pass' },
  NE_EAST_FACE: { id: 'NE_EAST_FACE', x: 840, y: 390, name: 'East Shovel Loading Pocket' },
  NE_EAST_DESCENT: { id: 'NE_EAST_DESCENT', x: 835, y: 465, name: 'East Ramp Mid Descent' },
  EAST_JUNCTION: { id: 'EAST_JUNCTION', x: 815, y: 530, name: 'East Perimeter Haul Junction' },

  // Active Blasting Sector B-2 & Mid Cut
  BLAST_ZONE_WEST: { id: 'BLAST_ZONE_WEST', x: 530, y: 375, name: 'Blast Zone West Checkpoint' },
  BLAST_ZONE_APPROACH: { id: 'BLAST_ZONE_APPROACH', x: 595, y: 380, name: 'Blast Zone Safety Gate' },
  BLAST_ZONE_CORE: { id: 'BLAST_ZONE_CORE', x: 655, y: 415, name: 'Active Blasting Sector B-2' },
  BLAST_ZONE_EAST: { id: 'BLAST_ZONE_EAST', x: 720, y: 435, name: 'Blasting East Discharge' },
  BLAST_ZONE_TIE: { id: 'BLAST_ZONE_TIE', x: 765, y: 450, name: 'Blasting Perimeter Tie' },

  NE_MID_ARC_1: { id: 'NE_MID_ARC_1', x: 605, y: 310, name: 'NE Mid Bench Ramp' },
  NE_MID_ARC_2: { id: 'NE_MID_ARC_2', x: 675, y: 340, name: 'NE Mid Bench Turn' },
  NE_MID_ARC_3: { id: 'NE_MID_ARC_3', x: 735, y: 370, name: 'NE Mid Bench Concourse' },

  // 5. Southeast Overburden Tail
  SE_HAUL_EXIT: { id: 'SE_HAUL_EXIT', x: 775, y: 590, name: 'SE Overburden Portal' },
  SE_TAIL_1: { id: 'SE_TAIL_1', x: 815, y: 640, name: 'SE Overburden Haul 1' },
  SE_TAIL_2: { id: 'SE_TAIL_2', x: 860, y: 685, name: 'SE Overburden Haul 2' },
  SE_TAIL_3: { id: 'SE_TAIL_3', x: 915, y: 715, name: 'SE Waste Dump Approach' },
  SE_TAIL_END: { id: 'SE_TAIL_END', x: 970, y: 730, name: 'SE Waste Dump Apex' },

  // 6. West Arterial Haul Road (past LV-01)
  WEST_PATROL_1: { id: 'WEST_PATROL_1', x: 335, y: 430, name: 'West Haulway North' },
  WEST_PATROL_2: { id: 'WEST_PATROL_2', x: 330, y: 540, name: 'West Haulway Mid (LV-01 Post)' },
  WEST_PATROL_3: { id: 'WEST_PATROL_3', x: 325, y: 630, name: 'West Haulway South' },
  WEST_PATROL_4: { id: 'WEST_PATROL_4', x: 305, y: 710, name: 'Crusher West Approach' },

  // 7. Central Pit Excavation & Dividing Ramps
  PIT_WEST_RAMP_1: { id: 'PIT_WEST_RAMP_1', x: 450, y: 480, name: 'Central Ramp Mid' },
  PIT_WEST_RAMP_2: { id: 'PIT_WEST_RAMP_2', x: 420, y: 545, name: 'Central Ramp Lower Turn' },
  PIT_WEST_RAMP_3: { id: 'PIT_WEST_RAMP_3', x: 400, y: 620, name: 'South Pit West Incline' },
  SOUTH_PIT_WEST_JUNC: { id: 'SOUTH_PIT_WEST_JUNC', x: 395, y: 680, name: 'South Pit West Junction' },

  PIT_EAST_DIVIDE_1: { id: 'PIT_EAST_DIVIDE_1', x: 520, y: 440, name: 'East Pit Divide 1' },
  PIT_EAST_DIVIDE_2: { id: 'PIT_EAST_DIVIDE_2', x: 575, y: 505, name: 'East Pit Divide 2' },
  PIT_EAST_DIVIDE_3: { id: 'PIT_EAST_DIVIDE_3', x: 635, y: 565, name: 'East Pit Divide 3' },
  PIT_EAST_DIVIDE_4: { id: 'PIT_EAST_DIVIDE_4', x: 690, y: 600, name: 'East Pit Divide 4' },
  SOUTH_DIVIDE_JUNC: { id: 'SOUTH_DIVIDE_JUNC', x: 730, y: 615, name: 'South Divide Junction' },

  // Central Pit Cross-Cut
  PIT_CROSS_1: { id: 'PIT_CROSS_1', x: 490, y: 655, name: 'Central Pit Cross Cut West' },
  PIT_CROSS_2: { id: 'PIT_CROSS_2', x: 580, y: 650, name: 'Central Pit Cross Cut Mid' },
  PIT_CROSS_3: { id: 'PIT_CROSS_3', x: 660, y: 640, name: 'Central Pit Cross Cut East' },

  // 8. Southern Perimeter Haul Road
  SOUTH_PERIM_1: { id: 'SOUTH_PERIM_1', x: 690, y: 660, name: 'South Perimeter Turn 1' },
  SOUTH_PERIM_2: { id: 'SOUTH_PERIM_2', x: 650, y: 710, name: 'South Perimeter Turn 2' },
  SOUTH_PERIM_JUNC: { id: 'SOUTH_PERIM_JUNC', x: 625, y: 740, name: 'South Perimeter Haul Junction' },
  SOUTH_PERIM_3: { id: 'SOUTH_PERIM_3', x: 560, y: 760, name: 'South Rim Haulway East' },
  SOUTH_PERIM_4: { id: 'SOUTH_PERIM_4', x: 490, y: 765, name: 'South Rim Haulway Mid' },
  SOUTH_PERIM_5: { id: 'SOUTH_PERIM_5', x: 430, y: 765, name: 'South Rim Haulway West' },
  SOUTH_PERIM_WEST_GATE: { id: 'SOUTH_PERIM_WEST_GATE', x: 375, y: 755, name: 'Crusher East Access Gate' },

  // 9. Gyratory Crusher & Fuel Depot Complex Loops
  CRUSHER_DEPOT: { id: 'CRUSHER_DEPOT', x: 345, y: 755, name: 'Gyratory Crusher & Fuel Depot' },
  CRUSHER_UPPER_1: { id: 'CRUSHER_UPPER_1', x: 350, y: 680, name: 'Crusher Upper Feed 1' },
  CRUSHER_UPPER_2: { id: 'CRUSHER_UPPER_2', x: 320, y: 665, name: 'Crusher Upper Feed 2' },
  CRUSHER_UPPER_3: { id: 'CRUSHER_UPPER_3', x: 285, y: 680, name: 'Crusher Dump Pocket Apex' },
  CRUSHER_UPPER_4: { id: 'CRUSHER_UPPER_4', x: 270, y: 705, name: 'Crusher West Ramp' },
  CRUSHER_UPPER_5: { id: 'CRUSHER_UPPER_5', x: 275, y: 735, name: 'Crusher Fuel Station' },
  CRUSHER_UPPER_6: { id: 'CRUSHER_UPPER_6', x: 305, y: 750, name: 'Crusher Weighbridge' },

  CRUSHER_LOWER_1: { id: 'CRUSHER_LOWER_1', x: 300, y: 775, name: 'Depot South Turn' },
  CRUSHER_LOWER_2: { id: 'CRUSHER_LOWER_2', x: 335, y: 805, name: 'Depot Lower Rim 1' },
  CRUSHER_LOWER_3: { id: 'CRUSHER_LOWER_3', x: 380, y: 810, name: 'Depot Lower Rim 2' },
  CRUSHER_LOWER_4: { id: 'CRUSHER_LOWER_4', x: 470, y: 800, name: 'South Berm Express (LV-02 Post)' },
  CRUSHER_LOWER_5: { id: 'CRUSHER_LOWER_5', x: 560, y: 775, name: 'South Incline Tie' }
};

/**
 * Connected road segments traced directly from the purple reference image.
 * Rendered in SVG as realistic brown/tan dirt mining haul roads.
 */
export const MINE_ROAD_SEGMENTS: RoadSegment[] = [
  // 1. Northwest Crest Access Road
  {
    id: 'seg-nw-access',
    from: 'NW_ACCESS_GATE',
    to: 'NW_FORK',
    width: 22,
    points: [
      { x: 185, y: 70 },
      { x: 200, y: 120 },
      { x: 220, y: 170 },
      { x: 255, y: 215 },
      { x: 295, y: 240 }
    ]
  },

  // 2. Highwall Geotech Pit Loop (Upper Rim)
  {
    id: 'seg-highwall-upper-rim',
    from: 'NW_FORK',
    to: 'CENTRAL_HUB',
    width: 20,
    points: [
      { x: 295, y: 240 },
      { x: 345, y: 200 },
      { x: 410, y: 195 },
      { x: 465, y: 215 },
      { x: 505, y: 245 },
      { x: 495, y: 310 },
      { x: 475, y: 385 }
    ]
  },

  // 3. Highwall Geotech Pit Loop (Lower Rim & Hazard Portal)
  {
    id: 'seg-highwall-lower-rim',
    from: 'NW_FORK',
    to: 'CENTRAL_HUB',
    width: 22,
    points: [
      { x: 295, y: 240 },
      { x: 315, y: 285 },
      { x: 345, y: 330 },
      { x: 405, y: 355 },
      { x: 475, y: 385 }
    ]
  },

  // 4. West Outer Perimeter Road (from Highwall SW to Crusher Depot)
  {
    id: 'seg-west-outer-pass',
    from: 'HIGHWALL_HAZARD_S',
    to: 'CRUSHER_DEPOT',
    width: 20,
    points: [
      { x: 345, y: 330 },
      { x: 335, y: 430 },
      { x: 330, y: 540 },
      { x: 325, y: 630 },
      { x: 305, y: 710 },
      { x: 345, y: 755 }
    ]
  },

  // 5. Northeast Outer Rim Road
  {
    id: 'seg-ne-outer-north-rim',
    from: 'CENTRAL_HUB',
    to: 'NE_EAST_FACE',
    width: 22,
    points: [
      { x: 475, y: 385 },
      { x: 505, y: 315 },
      { x: 535, y: 260 },
      { x: 585, y: 235 },
      { x: 645, y: 225 },
      { x: 705, y: 230 },
      { x: 755, y: 250 },
      { x: 790, y: 285 },
      { x: 825, y: 330 },
      { x: 840, y: 390 }
    ]
  },

  // 6. Northeast Outer Eastern Rim (descending to SE)
  {
    id: 'seg-ne-outer-east-rim',
    from: 'NE_EAST_FACE',
    to: 'SE_HAUL_EXIT',
    width: 22,
    points: [
      { x: 840, y: 390 },
      { x: 835, y: 465 },
      { x: 815, y: 530 },
      { x: 775, y: 590 }
    ]
  },

  // 7. Active Blasting Sector B-2 Central Cut Road
  {
    id: 'seg-blast-zone-central-cut',
    from: 'CENTRAL_HUB',
    to: 'EAST_JUNCTION',
    width: 22,
    points: [
      { x: 475, y: 385 },
      { x: 530, y: 375 },
      { x: 595, y: 380 },
      { x: 655, y: 415 },
      { x: 720, y: 435 },
      { x: 765, y: 450 },
      { x: 815, y: 530 }
    ]
  },

  // 8. Northeast Mid-Bench Arc
  {
    id: 'seg-ne-mid-bench-arc',
    from: 'NE_BENCH_PASS',
    to: 'BLAST_ZONE_TIE',
    width: 18,
    points: [
      { x: 535, y: 260 },
      { x: 605, y: 310 },
      { x: 675, y: 340 },
      { x: 735, y: 370 },
      { x: 765, y: 450 }
    ]
  },

  // 9. Southeast Overburden Tail Road
  {
    id: 'seg-se-overburden-tail',
    from: 'SE_HAUL_EXIT',
    to: 'SE_TAIL_END',
    width: 22,
    points: [
      { x: 775, y: 590 },
      { x: 815, y: 640 },
      { x: 860, y: 685 },
      { x: 915, y: 715 },
      { x: 970, y: 730 }
    ]
  },

  // 10. Central Pit West Ramp
  {
    id: 'seg-central-pit-west-ramp',
    from: 'CENTRAL_HUB',
    to: 'SOUTH_PIT_WEST_JUNC',
    width: 24,
    points: [
      { x: 475, y: 385 },
      { x: 450, y: 480 },
      { x: 420, y: 545 },
      { x: 400, y: 620 },
      { x: 395, y: 680 }
    ]
  },

  // 11. Central Pit East Divide
  {
    id: 'seg-central-pit-east-divide',
    from: 'CENTRAL_HUB',
    to: 'SOUTH_DIVIDE_JUNC',
    width: 24,
    points: [
      { x: 475, y: 385 },
      { x: 520, y: 440 },
      { x: 575, y: 505 },
      { x: 635, y: 565 },
      { x: 690, y: 600 },
      { x: 730, y: 615 }
    ]
  },

  // 12. East Perimeter Connector
  {
    id: 'seg-east-perimeter-connector',
    from: 'SOUTH_DIVIDE_JUNC',
    to: 'SE_HAUL_EXIT',
    width: 22,
    points: [
      { x: 730, y: 615 },
      { x: 775, y: 590 }
    ]
  },

  // 13. Central Pit Cross-Cut
  {
    id: 'seg-central-pit-cross-cut',
    from: 'SOUTH_PIT_WEST_JUNC',
    to: 'SOUTH_DIVIDE_JUNC',
    width: 20,
    points: [
      { x: 395, y: 680 },
      { x: 490, y: 655 },
      { x: 580, y: 650 },
      { x: 660, y: 640 },
      { x: 730, y: 615 }
    ]
  },

  // 14. Southern Perimeter Haul Road
  {
    id: 'seg-south-perimeter-road',
    from: 'SOUTH_DIVIDE_JUNC',
    to: 'SOUTH_PERIM_WEST_GATE',
    width: 24,
    points: [
      { x: 730, y: 615 },
      { x: 690, y: 660 },
      { x: 650, y: 710 },
      { x: 625, y: 740 },
      { x: 560, y: 760 },
      { x: 490, y: 765 },
      { x: 430, y: 765 },
      { x: 375, y: 755 }
    ]
  },

  // 15. Crusher Upper Loop
  {
    id: 'seg-crusher-upper-loop',
    from: 'SOUTH_PIT_WEST_JUNC',
    to: 'CRUSHER_DEPOT',
    width: 22,
    points: [
      { x: 395, y: 680 },
      { x: 350, y: 680 },
      { x: 320, y: 665 },
      { x: 285, y: 680 },
      { x: 270, y: 705 },
      { x: 275, y: 735 },
      { x: 305, y: 750 },
      { x: 345, y: 755 }
    ]
  },

  // 16. Crusher Lower Loop (sweeps around southern rim past LV-02)
  {
    id: 'seg-crusher-lower-loop',
    from: 'CRUSHER_DEPOT',
    to: 'SOUTH_PERIM_JUNC',
    width: 24,
    points: [
      { x: 345, y: 755 },
      { x: 300, y: 775 },
      { x: 335, y: 805 },
      { x: 380, y: 810 },
      { x: 470, y: 800 },
      { x: 560, y: 775 },
      { x: 625, y: 740 }
    ]
  },

  // 17. Crusher Perimeter Tie
  {
    id: 'seg-crusher-connector',
    from: 'SOUTH_PERIM_WEST_GATE',
    to: 'CRUSHER_DEPOT',
    width: 22,
    points: [
      { x: 375, y: 755 },
      { x: 345, y: 755 }
    ]
  }
];

/**
 * Natural vehicle patrol routes cycling smoothly along the traced road network.
 * Vehicles travel strictly along these road segments in natural loops/reversals.
 */
export const FLEET_ROAD_ROUTES: Record<string, Position[]> = {
  // HT-01: North Haul Loop (Central Hub -> Highwall Upper Rim -> NW Fork -> Highwall Lower Rim -> Central Hub)
  'HT-01': [
    { x: 475, y: 385 }, // Central Hub
    { x: 495, y: 310 },
    { x: 505, y: 245 },
    { x: 465, y: 215 },
    { x: 410, y: 195 },
    { x: 345, y: 200 },
    { x: 295, y: 240 }, // NW Fork
    { x: 315, y: 285 },
    { x: 345, y: 330 }, // Highwall Geotech Hazard Portal
    { x: 405, y: 355 },
    { x: 475, y: 385 }  // Back to Central Hub
  ],

  // HT-02: Arterial Haul (Highwall Rim -> Central Hub -> West Ramp -> Crusher Upper Loop -> Depot)
  'HT-02': [
    { x: 295, y: 240 }, // NW Fork
    { x: 315, y: 285 },
    { x: 345, y: 330 }, // Highwall Hazard Portal
    { x: 405, y: 355 },
    { x: 475, y: 385 }, // Central Hub
    { x: 450, y: 480 },
    { x: 420, y: 545 },
    { x: 400, y: 620 },
    { x: 395, y: 680 }, // South Pit West Junction
    { x: 350, y: 680 },
    { x: 320, y: 665 },
    { x: 285, y: 680 },
    { x: 270, y: 705 },
    { x: 275, y: 735 },
    { x: 305, y: 750 },
    { x: 345, y: 755 }, // Crusher Depot
    { x: 305, y: 750 },
    { x: 275, y: 735 },
    { x: 270, y: 705 },
    { x: 285, y: 680 },
    { x: 320, y: 665 },
    { x: 350, y: 680 },
    { x: 395, y: 680 },
    { x: 400, y: 620 },
    { x: 420, y: 545 },
    { x: 450, y: 480 },
    { x: 475, y: 385 },
    { x: 405, y: 355 },
    { x: 345, y: 330 },
    { x: 315, y: 285 }
  ],

  // HT-03: East & South Pit Haul Loop (East Junction -> South Divide -> South Perimeter -> Crusher Lower Loop)
  'HT-03': [
    { x: 815, y: 530 }, // East Junction
    { x: 775, y: 590 }, // SE Haul Exit
    { x: 730, y: 615 }, // South Divide Junction
    { x: 690, y: 660 },
    { x: 650, y: 710 },
    { x: 625, y: 740 }, // South Perimeter Junction
    { x: 560, y: 775 },
    { x: 470, y: 800 },
    { x: 380, y: 810 },
    { x: 335, y: 805 },
    { x: 300, y: 775 },
    { x: 345, y: 755 }, // Crusher Depot
    { x: 375, y: 755 },
    { x: 430, y: 765 },
    { x: 490, y: 765 },
    { x: 560, y: 760 },
    { x: 625, y: 740 },
    { x: 650, y: 710 },
    { x: 690, y: 660 },
    { x: 730, y: 615 },
    { x: 775, y: 590 }
  ],

  // HT-04: Test vehicle (Patrols along road toward and through Blasting Sector B-2)
  'HT-04': [
    { x: 475, y: 385 }, // Central Hub
    { x: 530, y: 375 },
    { x: 595, y: 380 },
    { x: 655, y: 415 }, // Active Blasting Sector B-2 (Core)
    { x: 720, y: 435 },
    { x: 765, y: 450 },
    { x: 815, y: 530 }, // East Junction
    { x: 765, y: 450 },
    { x: 720, y: 435 },
    { x: 655, y: 415 },
    { x: 595, y: 380 },
    { x: 530, y: 375 }
  ],

  // LV-01: Security & Geotech Patrol LandCruiser (Patrols West Outer Ridge to Crusher)
  'LV-01': [
    { x: 345, y: 330 }, // Highwall Geotech Hazard Portal
    { x: 335, y: 430 },
    { x: 330, y: 540 }, // West Post
    { x: 325, y: 630 },
    { x: 305, y: 710 },
    { x: 345, y: 755 }, // Crusher Depot
    { x: 305, y: 710 },
    { x: 325, y: 630 },
    { x: 330, y: 540 },
    { x: 335, y: 430 }
  ],

  // LV-02: Geotech Survey Rover (Patrols Lower Southern Rim & Berm)
  'LV-02': [
    { x: 345, y: 755 }, // Crusher Depot
    { x: 300, y: 775 },
    { x: 335, y: 805 },
    { x: 380, y: 810 },
    { x: 470, y: 800 }, // South Berm Post
    { x: 560, y: 775 },
    { x: 625, y: 740 },
    { x: 560, y: 775 },
    { x: 470, y: 800 },
    { x: 380, y: 810 },
    { x: 335, y: 805 },
    { x: 300, y: 775 }
  ],

  // EX-01: Stationary electric rope shovel at East Working Face
  'EX-01': [
    { x: 840, y: 390 }
  ],

  // DR-01: Blast-hole drill rig on Bench #4
  'DR-01': [
    { x: 705, y: 230 }
  ]
};

/**
 * Calculates heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 * from point A to point B
 */
export function calculateRoadHeading(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/**
 * Generates an SVG path string for all haul roads to render the realistic brown haul network
 */
export function getHaulRoadNetworkSvgPaths(): string[] {
  return MINE_ROAD_SEGMENTS.map(seg => {
    if (seg.points.length === 0) return '';
    let d = `M ${seg.points[0].x} ${seg.points[0].y}`;
    for (let i = 1; i < seg.points.length; i++) {
      d += ` L ${seg.points[i].x} ${seg.points[i].y}`;
    }
    return d;
  });
}

/**
 * Adjacency Graph for shortest path routing between any two waypoints in the mine.
 */
export class MineRoadGraph {
  private adjacency: Map<string, Array<{ to: string; distance: number; path: Position[] }>> = new Map();

  constructor() {
    this.buildGraph();
  }

  private buildGraph() {
    MINE_ROAD_SEGMENTS.forEach(seg => {
      let segDist = 0;
      for (let i = 1; i < seg.points.length; i++) {
        segDist += Math.hypot(seg.points[i].x - seg.points[i - 1].x, seg.points[i].y - seg.points[i - 1].y);
      }

      // Bidirectional edges
      if (!this.adjacency.has(seg.from)) this.adjacency.set(seg.from, []);
      if (!this.adjacency.has(seg.to)) this.adjacency.set(seg.to, []);

      this.adjacency.get(seg.from)!.push({
        to: seg.to,
        distance: segDist,
        path: seg.points
      });

      this.adjacency.get(seg.to)!.push({
        to: seg.from,
        distance: segDist,
        path: [...seg.points].reverse()
      });
    });
  }

  /**
   * Find shortest path of waypoints between any two graph nodes
   */
  public findPath(fromNodeId: string, toNodeId: string): Position[] {
    if (fromNodeId === toNodeId) {
      const wp = MINE_WAYPOINTS[fromNodeId];
      return wp ? [{ x: wp.x, y: wp.y }] : [];
    }

    const distances: Map<string, number> = new Map();
    const previous: Map<string, { from: string; path: Position[] }> = new Map();
    const queue: Set<string> = new Set();

    Object.keys(MINE_WAYPOINTS).forEach(id => {
      distances.set(id, Infinity);
      queue.add(id);
    });

    distances.set(fromNodeId, 0);

    while (queue.size > 0) {
      let closestNode: string | null = null;
      let smallestDist = Infinity;

      for (const node of queue) {
        const d = distances.get(node) ?? Infinity;
        if (d < smallestDist) {
          smallestDist = d;
          closestNode = node;
        }
      }

      if (!closestNode || smallestDist === Infinity) break;
      if (closestNode === toNodeId) break;

      queue.delete(closestNode);

      const neighbors = this.adjacency.get(closestNode) || [];
      for (const edge of neighbors) {
        if (!queue.has(edge.to)) continue;
        const alt = smallestDist + edge.distance;
        if (alt < (distances.get(edge.to) ?? Infinity)) {
          distances.set(edge.to, alt);
          previous.set(edge.to, { from: closestNode, path: edge.path });
        }
      }
    }

    // Reconstruct path
    const fullPath: Position[] = [];
    let curr: string | undefined = toNodeId;

    while (curr && previous.has(curr)) {
      const step: { from: string; path: Position[] } = previous.get(curr)!;
      // Prepend points
      const pts = step.path;
      for (let i = pts.length - 1; i >= 0; i--) {
        fullPath.unshift(pts[i]);
      }
      curr = step.from;
    }

    return fullPath;
  }
}

export const mineRoadGraph = new MineRoadGraph();
