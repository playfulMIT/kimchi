export const APP = document.getElementById('app')
export const API = `/api/dashboard/${GROUP}` 

export const TABS = {
    EVENT_STREAM: "EVENT_STREAM",
    METRICS: "METRICS"
}

export const DIFFICULTY_LEVEL = {
    BEGINNER: "beginner",
    INTERMEDIATE: "intermediate",
    ADVANCED: "advanced"
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

export const LEVELS = {
    "beginner" : [
        "1. One Box",
        "2. Separated Boxes",
        "3. Rotate a Pyramid",
        "4. Match Silhouettes",
        "5. Removing Objects",
        "6. Stretch a Ramp",
        "7. Max 2 Boxes",
        "8. Combine 2 Ramps",
        "9. Scaling Round Objects"
    ],
    "intermediate": [
        "Square Cross-Sections",
        "Bird Fez",
        "Pi Henge",
        "45-Degree Rotations",
        "Pyramids are Strange",
        "Boxes Obscure Spheres",
        "Object Limits",
        "Tetromino",
        "Angled Silhouette"
    ],
    "advanced": [
        "Sugar Cones",
        "Stranger Shapes",
        "Tall and Small",
        "Ramp Up and Can It",
        "More Than Meets Your Eye",
        "Not Bird",
        "Unnecessary",
        "Zzz",
        "Bull Market",
        "Few Clues",
        "Orange Dance",
        "Bear Market"
    ]
}