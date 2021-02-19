export const APP = document.getElementById('app')
export const API = `/api/dashboard/${GROUP}` 

export const TABS = {
    METRICS: "METRICS",
    PUZZLE_RADAR_CHART: "PUZZLE_RADAR_CHART",
    STUDENT_RADAR_CHART: "STUDENT_RADAR_CHART",
    OUTLIER_RADAR_CHART: "OUTLIER_RADAR_CHART",
    PUZZLE_SEQ_NETWORK: "PUZZLE_SEQ_NETWORK",
    ML_OUTLIERS: "ML_OUTLIERS",
    PORTAL: "PORTAL"
}

export const SANDBOX = "sandbox"
export const SANDBOX_PUZZLE_NAME = "Sandbox"

export const INDEX_TO_XFM_MODE = ["MOVE", "ROTATE", "SCALE"]
export const INDEX_TO_SHAPE = ["CUBE", "PYRAMID", "RAMP", "CYLINDER", "CONE", "SPHERE"]
export const DEFAULT_FUNNEL = { started: 0, create_shape: 0, submitted: 0, completed: 0 }
export const DEFAULT_SHAPE_ARRAY = new Array(INDEX_TO_SHAPE.length).fill(0)
export const DEFAULT_MODE_ARRAY = new Array(INDEX_TO_XFM_MODE.length).fill(0)
export const SNAPSHOT_BIN_SIZE = 2
export const SESSION_BIN_SIZE = 3
export const TIME_BIN_SIZE = 30

export const FUNNEL_KEY_NAME_MAP = {
    started: "started puzzle",
    create_shape: "created a shape",
    submitted: "submitted an attempt",
    completed: "completed puzzle"
}

export const DEFAULT_LEVELS_OF_ACTIVITY = {
    active_time: 0,
    "ws-create_shape": 0,
    "ws-delete_shape": 0,
    different_events: 0,
    event: 0,
    "ws-move_shape": 0,
    "ws-paint": 0,
    "ws-redo_action": 0,
    "ws-rotate_view": 0,
    "ws-scale_shape": 0,
    "ws-rotate_shape": 0,
    "ws-snapshot": 0,
    "ws-undo_action": 0,
    "ws-check_solution": 0
}

export const METRIC_TO_METRIC_NAME = {
    "active_time": "Active Time",
    "ws-create_shape": "Create Shape",
    "event": "Event Count",
    "different_events": "Unique Event Count",
    "ws-move_shape": "Move Shape",
    "ws-rotate_shape": "Rotate Shape",
    "ws-scale_shape": "Scale Shape",
    "ws-delete_shape": "Delete Shape",
    "ws-paint": "Paint",
    "ws-undo_action": "Undo Action",
    "ws-redo_action": "Redo Action",
    "ws-rotate_view": "Rotate View",
    "ws-snapshot": "Snapshot",
    "ws-check_solution": "Check Solution"
}

export const LEVELS_OF_ACTIVITY_DROPDOWN = [
    {
        axis: "Create Shape",
        value: "ws-create_shape"
    },
    {
        axis: "Move Shape",
        value: "ws-move_shape"
    },
    {
        axis: "Rotate Shape",
        value: "ws-rotate_shape"
    },
    {
        axis: "Scale Shape",
        value: "ws-scale_shape"
    },
    {
        axis: "Delete Shape",
        value: "ws-delete_shape"
    },
    {
        axis: "Paint",
        value: "ws-paint"
    },
    {
        axis: "Undo Action",
        value: "ws-undo_action"
    },
    {
        axis: "Redo Action",
        value: "ws-redo_action"
    },
    {
        axis: "Rotate View",
        value: "ws-rotate_view"
    },
    {
        axis: "Snapshot",
        value: "ws-snapshot"
    },
    {
        axis: "Check Solution",
        value: "ws-check_solution"
    }
]

export const NORMALIZATION_OPTIONS = {
    "NONE": 0,
    "MINMAX": 1,
    "STANDARD": 2
}

export const NORMALIZATION_OPTION_KEYS = {
    [NORMALIZATION_OPTIONS.NONE]: "no_normalization",
    [NORMALIZATION_OPTIONS.MINMAX]: "minmax_normalization",
    [NORMALIZATION_OPTIONS.STANDARD]: "standard_normalization"
}

export const MONSTER_IMAGE_PATHS = [
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 2.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 3.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 4.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 5.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 6.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 7.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 8.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 9.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 10.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 11.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 12.svg",
    "https://gbavizdemo.s3.amazonaws.com/SVG/asset 13.svg",
]

export const MISCONCEPTION_LABEL_MAP = {
    "s1a": "Misc A",
    "s1b": "Misc A",
    "s2a": "Misc A",
    "s2b": "Misc A",
    "s3a": "Misc A",
    "s3b": "Misc A",
    "s4a": "Misc A",
    "s4b": "Misc A",
    "s5a": "Misc A",
    "s5b": "Misc A",
    "s6a": "Misc A",
    "s6b": "Misc A",
    "s7a": "Misc A",
    "s7b": "Misc A",
    "s8a": "Misc A",
    "s8b": "Misc A",
    "Mis2": "Misc B",
    "Mis3": "Misc C",
    "Mis4": "Misc D",
    "Mis5": "Misc E"
}

export const PUZZLE_TO_KEY = {
    "1. One Box": 345,
    "2. Separated Boxes": 346,
    "3. Rotate a Pyramid": 347,
    "4. Match Silhouettes": 348,
    "5. Removing Objects": 349,
    "6. Stretch a Ramp": 350,
    "7. Max 2 Boxes": 351,
    "8. Combining 2 Ramps": 352,
    "9. Scaling Round Objects": 353,
    "Square Cross-Sections": 287,
    "Bird Fez": 294,
    "Pi Henge": 297,
    "45-Degree Rotations": 299,
    "Pyramids are Strange": 300,
    "Boxes Obscure Spheres": 301,
    "Object Limits": 302,
    "Warm Up": 293,
    "Tetromino": 293,
    "Angled Silhouette": 304,
    "Sugar Cones": 308,
    "Stranger Shapes": 298,
    "Tall and Small": 305,
    "Ramp It and Can It": 292,
    "More Than Meets Your Eye": 306,
    "Not Bird": 303,
    "Unnecessary": 309,
    "Zzz": 310,
    "Bull Market": 311,
    "Few Clues": 312,
    "Orange Dance": 313,
    "Bear Market": 314
}

export const MISCONCEPTION_TO_RECOMMENDATION = [
    {
        puzzle: "Not Bird",
        criteria: ["Mis2", "Mis1", "Mis1_1", "Mis1_3", "s2a", "s5a", "s7a"],
        recommendation: "Try more puzzles where cylinders should be used for a square/rectangular side, such as Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to:  Pi Henge, More Than Meets Your Eye. Try (or Revisit) more puzzles where pyramids should be used for a triangle side and square base: Rotate a Pyramid, Match Silhouettes, Removing Objects, Square Cross- Sections, Pyramids are Strange, Angled Silhouette, Stranger Shapes.Can be used but doesn’t need to: Bird Fez, Few Clues"
    },
    {
        puzzle: "Not Bird",
        criteria: ["Mis2", "Mis1", "Mis1_1", "s5a", "s7a"],
        recommendation: "Try (or Revisit) more puzzles where pyramids should be used for a triangle side and square base: Rotate a Pyramid, Match Silhouettes, Removing Objects, Square Cross-Sections, Pyramids are Strange, Angled Silhouette, Stranger Shapes. Can be used but doesn’t need to: Bird Fez, Few Clues.\nTry more puzzles where cylinders should be used for a square/ rectangular side, such as Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance.Puzzles where cylinders can be used but don’t need to: Pi Henge, More Than Meets Your Eye."
    },
    {
        puzzle: "Not Bird",
        criteria: ["Mis2", "Mis1", "Mis1_3", "s2a"],
        recommendation: "Try more puzzles where cylinders should be used for a square/rectangular side, such as Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to:  Pi Henge, More Than Meets Your Eye."
    },
    {
        puzzle: "Square Cross-Sections",
        criteria: ["Mis2", "Mis1", "Mis1_1", "s7a"],
        recommendation: "Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to: Pi Henge, More Than Meets Your Eye."
    },
    {
        puzzle: "Square Cross-Sections",
        criteria: ["Mis2", "Mis1", "Mis1_1", "s8b"],
        recommendation: "Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to: Pi Henge, More Than Meets Your Eye."
    },
    {
        puzzle: "Square Cross-Sections",
        criteria: ["Mis2", "Mis1", "Mis1_1", "s5a", "s7a"],
        recommendation: "Try more puzzles where cylinders should be used for a square/rectangular side, such as Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to:  Pi Henge, More Than Meets Your Eye. Try(or Revisit) more puzzles where pyramids should be used for a triangle side and square base: Rotate a Pyramid, Match Silhouettes, Removing Objects, Pyramids are Strange, Angled Silhouette, Stranger Shapes.Can be used but doesn’t need to: Bird Fez, Not Bird, Few Clues"
    },
    {   
        puzzle: "Square Cross-Sections",
        criteria: ["Mis2", "Mis1", "Mis1_1", "s5a"],
        recommendation: "Scaling Round Objects, Boxes Obscure Spheres, Ramp Up and Can It, Not Bird, Unnecessary, Zzz, Orange Dance. Puzzles where cylinders can be used but don’t need to: Pi Henge, More Than Meets Your Eye."
    }
]