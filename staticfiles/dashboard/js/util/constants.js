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
