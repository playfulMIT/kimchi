export const APP = document.getElementById('app')
export const API = `/api/dashboard/${GROUP}` 

export const TABS = {
    METRICS: "METRICS",
    PUZZLE_RADAR_CHART: "PUZZLE_RADAR_CHART",
    STUDENT_RADAR_CHART: "STUDENT_RADAR_CHART",
    OUTLIER_RADAR_CHART: "OUTLIER_RADAR_CHART"
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
    create_shape: 0,
    delete_shape: 0,
    different_events: 0,
    event: 0,
    move_shape: 0,
    paint: 0,
    redo_action: 0,
    rotate_view: 0,
    scale_shape: 0,
    snapshot: 0,
    undo_action: 0
}

export const METRIC_TO_METRIC_NAME = {
    "active_time": "Active Time",
    "create_shape": "Create Shape",
    "move_shape": "Move Shape",
    "scale_shape": "Scale Shape",
    "delete_shape": "Delete Shape",
    "paint": "Paint",
    "undo_action": "Undo Action",
    "redo_action": "Redo Action",
    "rotate_view": "Rotate View",
    "snapshot": "Snapshot"
}

export const LEVELS_OF_ACTIVITY_DROPDOWN = [
    {
        axis: "Create Shape",
        value: "create_shape"
    },
    {
        axis: "Move Shape",
        value: "move_shape"
    },
    {
        axis: "Scale Shape",
        value: "scale_shape"
    },
    {
        axis: "Delete Shape",
        value: "delete_shape"
    },
    {
        axis: "Paint",
        value: "paint"
    },
    {
        axis: "Undo Action",
        value: "undo_action"
    },
    {
        axis: "Redo Action",
        value: "redo_action"
    },
    {
        axis: "Rotate View",
        value: "rotate_view"
    },
    {
        axis: "Snapshot",
        value: "snapshot"
    }
]