// Copied from StackOverflow: https://stackoverflow.com/a/5617276 and adapted for HTML display

function prettyprint(object, depth, embedded) {
    typeof (depth) == "number" || (depth = 0)
    typeof (embedded) == "boolean" || (embedded = false)
    var newline = false
    var spacer = function (depth) { var spaces = ""; for (var i = 0; i < depth; i++) { spaces += "&nbsp;" }; return spaces }
    var pretty = ""
    if (typeof (object) == "undefined") { pretty += "undefined" }
    else if (typeof (object) == "number" ||
        typeof (object) == "number") { pretty += object.toString() }
    
    else if (object == null) { pretty += "null" }
    else if (object instanceof (Array)) {
        if (object.length > 0) {
            if (embedded) { newline = true }
            var content = ""
            for (const item of object) { content += spacer(depth + 1) + prettyprint(item, depth + 1) + ",<br>" }
            content = content.replace(/,<br>\s*$/, "").replace(/^\s*/, "")
            pretty += "[ <br> " + content + " <br>" + spacer(depth) + "]"
        } else { pretty += "[]" }
    }
    else if (typeof (object) == "string") { pretty += "\"" + object + "\"" }
    else if (typeof (object) == "object") {
        if (Object.keys(object).length > 0) {
            if (embedded) { newline = true }
            var content = ""
            for (var key in object) {
                content += spacer(depth + 1) + key.toString() + ": " + prettyprint(object[key], depth + 2, true) + ",<br>"
            }
            content = content.replace(/,<br>\s*$/, "").replace(/^\s*/, "")
            pretty += "{ <br>" + content + "<br>" + spacer(depth) + "}"
        } else { pretty += "{}" }
    }
    else { pretty += object.toString() }
    return ((newline ? "<br>" + spacer(depth) : "") + pretty)
}