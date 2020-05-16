export const APP = document.getElementById('app')
export const API = `/api/dashboard/${GROUP}` 

export const TABS = {
    METRICS: "METRICS",
    PUZZLE_RADAR_CHART: "PUZZLE_RADAR_CHART",
    STUDENT_RADAR_CHART: "STUDENT_RADAR_CHART"
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