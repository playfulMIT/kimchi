//global variables for viz objects
var activeTime;
var toolsUsed;
var toolsUsedNEW;
var failedAttempts;
var failedAttemptsMap;
var processedData;

//puzzle difficulty categories used for active time viz
var puzzle_categories = {
    "One Box": 1,
    "Separated Boxes": 1,
    "Rotate a Pyramid": 1,
    "Match Silhouettes": 1,
    "Removing Objects": 1,
    "Stretch a Ramp": 1,
    "Max 2 Boxes": 1,
    "Combine 2 Ramps": 1,
    "Scaling Round Objects": 1,
    "Square Cross-Sections": 2,
    "Bird Fez": 2,
    "Pi Henge": 2,
    "45-Degree Rotations": 2,
    "Pyramids are Strange": 2,
    "Boxes Obscure Spheres": 2,
    "Object Limits": 2,
    "Angled Silhouette": 2,
    "Warm Up": 2,
    "Not Bird": 3,
    "Stranger Shapes": 3,
    "Sugar Cones": 3,
    "Tall and Small": 3,
    "Ramp Up and Can It": 3,
    "More Than Meets Your Eye": 3,
    "Unnecessary": 3,
    "Zzz": 3,
    "Bull Market": 3,
    "Few Clues": 3,
    "Orange Dance": 3,
    "Bear Market": 3,
};

export function processPersistenceAddOnsData(persistenceData, persistenceByPuzzleData) {
    processedData = []
    var idx = 0

    for (var i of Object.keys(persistenceData)) {
        processedData[idx] = new Object()
        processedData[idx].user = i
        processedData[idx].data = persistenceData[i]
        processedData[idx].score = persistenceByPuzzleData[i] ? persistenceByPuzzleData[i].cumulative.score : "N/A"
        idx++
    }

    processedData = processData(processedData)
}

export function renderPersistenceAddOns() {
    createVis(processedData)
}


function processData(data) {
    var new_data = []

    //each ~student~
    data.forEach(function (d) {

        //create keys for difficulty and pass/fail time
        d.AT_1_P = d.AT_1_F = d.AT_2_P = d.AT_2_F = d.AT_3_P = d.AT_3_F = d.active_time = d.num_failed_att = d.num_failed_puzz = d.reattempts_AF = 0
        d.byPuzzle = []

        //add puzzle difficulty and active time by category
        for (var i in d.data) {

            var attempt = d.data[i]
            var task_id = attempt.task_id

            if (task_id[1] == ".")
                task_id = task_id.slice(3, (task_id.length))
            attempt.task_id = task_id
            attempt.puzzle_difficulty = puzzle_categories[task_id]

            d.active_time += attempt.active_time

            //assign active time categories based on puzzle difficulty
            switch (attempt.puzzle_difficulty) {
                case 1:
                    switch (attempt.completed) {
                        case 1:
                            d.AT_1_P += attempt.active_time
                            break;
                        case 0:
                            d.AT_1_F += attempt.active_time
                    }
                    break;

                case 2:
                    switch (attempt.completed) {
                        case 1:
                            d.AT_2_P += attempt.active_time
                            break;
                        case 0:
                            d.AT_2_F += attempt.active_time
                    }
                    break;

                case 3:
                    switch (attempt.completed) {
                        case 1:
                            d.AT_3_P += attempt.active_time
                            break;
                        case 0:
                            d.AT_3_F += attempt.active_time
                    }
            }
        }

        var failed_puzzles = []

        //Reattempts after failure
        for (var i in d.data) {
            var attempt = d.data[i]
            if (failed_puzzles.includes(attempt.task_id)) {
                if (attempt.completed == 1) {
                    d.data[i].reattempt_AF = 1;
                    d.reattempts_AF++;
                    //remove from failed puzzles array
                    failed_puzzles.splice(failed_puzzles.indexOf(attempt.task_id), 1);
                } else {
                    d.data[i].reattempt_AF = 1;
                    d.num_failed_att++;
                    d.reattempts_AF++;
                }
            } else {
                if (attempt.completed == 1) {
                    d.data[i].reattempt_AF = 0;
                    continue;
                } else {
                    d.data[i].reattempt_AF = 0;
                    d.num_failed_att++;
                    d.num_failed_puzz++;
                    failed_puzzles.push(attempt.task_id)
                }
            }
        }

        //populate byPuzzle array (individual student view)
        Object.keys(puzzle_categories).forEach(function (p) {
            var puzzle = new Object()
            puzzle["task_id"] = p
            puzzle["fails"] = 0
            puzzle["reattempts_AF"] = 0
            d.byPuzzle.push(puzzle)
        })

        d.data.forEach(function (a) {
            var task_id = a.task_id

            for (var i in d.byPuzzle) {
                if (d.byPuzzle[i].task_id == task_id) {
                    if (a.completed == 0) {
                        d.byPuzzle[i].fails++;
                    }

                    d.byPuzzle[i].reattempts_AF += a.reattempt_AF;
                }
            }
        })
    })

    var byPuzzle = []
    Object.keys(puzzle_categories).forEach(function (d) {
        var puzzle = new Object()
        puzzle["task_id"] = d
        puzzle["fails"] = 0
        puzzle["reattempts_AF"] = 0
        byPuzzle.push(puzzle)
    })

    //populate byPuzzle array (class view)
    data.forEach(function (d) {
        for (var i in d.data) {
            var attempt = d.data[i]
            var task_id = attempt.task_id

            for (var i in byPuzzle) {
                if (byPuzzle[i].task_id == task_id) {
                    if (attempt.completed == 0) {
                        byPuzzle[i].fails++;
                    }

                    byPuzzle[i].reattempts_AF += attempt.reattempt_AF;
                }
            }
        }
    })

    new_data.push(data)
    new_data.push(byPuzzle)

    return new_data;
}

function createVis(data) {

    var vis = initVis(data);

}

function initVis(data) {

    //disable active time sort checkbox
    d3.select(".sort")
        .select("input")
        .property("disabled", true)
        .property("checked", false);

    //successful/unsuccessful checkbox
    d3.select(".detail")
        .select("input")
        .property("checked", false);

    //individual viz objects
    activeTime = initActiveTime(data);
    toolsUsedNEW = initToolsUsed(data);
    failedAttempts = initFailedAttempts(data);
    failedAttemptsMap = initFailedAttemptsMap(data[1]);
}

function initToolsUsed(data) {

    var margin = { top: 50, right: 10, bottom: 100, left: 40 },
        width = 300 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    d3.select("#tools_used").selectAll("*").remove();

    //allocate space for viz
    var tools_used = d3.select("#tools_used");

    tools_used.svg = tools_used.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    //get total number of tool use for each student
    (data[0]).forEach(function (d) {
        d.n_rotate_view = d.data.reduce(function (total, attempt) {
            return total + attempt.n_rotate_view
        }, 0)

        d.n_snapshot = d.data.reduce(function (total, attempt) {
            return total + attempt.n_snapshot
        }, 0)

        d.n_submits = d.data.reduce(function (total, attempt) {
            return total + attempt.n_check_solution
        }, 0)

        d.num_attempts = d.data.length

        //tool use per attempt for each student
        d.rotate_view = (d.n_rotate_view / d.num_attempts)
        d.snapshot = (d.n_snapshot / d.num_attempts)
        d.submits = (d.n_submits / d.num_attempts)

        //d.per_score shows the final accumulated composite score
        d.per_score = d.score

    })

    //create axis for each tool
    function toolAxis(tool) {
        var x = d3.scaleLinear()
            .domain([0, d3.max(data[0], function (d) { return d[tool]; })]).nice()
            .range([0, width]);

        return x
    }

    var y = d3.scaleLinear()
        .domain([0, 100])
        .range([0, height])
        .call(d3.axisLeft(y))


    tools_used.svg.append("g")
        .attr("transform", "translate(0," + (height - 50) + ")")
        .call(d3.axisBottom(toolAxis('rotate_view')));

    tools_used.svg.append("g")
        .attr("transform", "translate(0," + 40 + ")")
        .call(d3.axisBottom(toolAxis('submits')));

    tools_used.svg.append("g")
        .attr("transform", "translate(0," + (height / 2) + ")")
        .call(d3.axisBottom(toolAxis('snapshot')));

    tools_used.svg.append("text")
        .attr("class", "circle label")
        .attr("text-anchor", "end")
        .attr("x", 75)
        .attr("y", - 25)
        .text("Check solution");

    tools_used.svg.append("text")
        .attr("class", "circle label")
        .attr("text-anchor", "end")
        .attr("x", 45)
        .attr("y", (height / 2) - 75)
        .text("Snapshot");

    tools_used.svg.append("text")
        .attr("class", "circle label")
        .attr("text-anchor", "end")
        .attr("x", 50)
        .attr("y", height - 140)
        .text("Rotate View");

    //color scale for below the mean
    function belowColorScale(toolName, tool) {
        var belowColor = d3.scaleLinear()
            .range(['#ddbedf', '#AA5DAF'])
            .domain([class_avg(toolName), (d3.min(data[0], function (d) {
                return d[toolName]
            }))])

        return belowColor(tool)
    }

    //color scale for above the mean
    function aboveColorScale(toolName, tool) {
        var aboveColor = d3.scaleLinear()
            .range(['#b2e7c6', '#00B242'])
            .domain([class_avg(toolName), (d3.max(data[0], function (d) {
                return d[toolName]
            }))])

        return aboveColor(tool)
    }

    function class_avg(tool) {
        return ((data[0].reduce(function (total, user) {
            return total + user[tool]
        }, 0)) / data[0].length)
    }

    function getPercentageChange(avg, student) {
        var sign;
        var difference = avg - student;
        var percentChange = (difference / ((avg + student) / 2)) * 100;

        if (Math.sign(percentChange) == 1)
            sign = "less"
        else
            sign = "more"

        return { PC: (Math.round(Math.abs(percentChange))), sign: sign };
    }

    function change(user, tool) {
        var change = getPercentageChange(class_avg(tool), (user[tool]))
        return (change.PC + "% " + change.sign)
    }

    var Tooltip = d3.select("#tools_used")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("height", "45px")
        .style("width", "200px")

    var mouseover = function (d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }

    var mouseleave = function (d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    var circle_clicked = false;

    //CHECK SOLUTIONS
    var node = tools_used.svg.append("g")
        .selectAll("dot")
        .data(data[0]).enter()
        .append("g")

    tools_used.dot = node.append("path")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(200))
        .attr("transform", function (d) {
            var x = toolAxis('submits')
            return "translate(" + x(d.submits) + "," + 15 + ")";
        })

        //fill based on relationship to the mean
        .style("fill", function (d) {
            if (d.submits < class_avg("submits")) {
                return belowColorScale("submits", d.submits)
            }
            else { return aboveColorScale("submits", d.submits) }
        })
        .style("opacity", .7)

        //grey out non-clicked
        .on("click", function (d) {
            if (circle_clicked == false) {
                highlightStudent(data[0], d);
                circle_clicked = true;
            } else {
                circle_clicked = false;
                unhighlightStudent(data[1], d);
            }
        })
        .on("mouseover", mouseover)
        .on("mousemove", function (d) {
            Tooltip
                .html(d.user + " used this tool " + d["submits"].toFixed(2) + " times per puzzle, " + change(d, "submits") + " than average.")
                .style("left", (d3.mouse(this)[0] + 90) + "px")
                .style("top", (d3.mouse(this)[1] + 25) + "px")
        })
        .on("mouseleave", mouseleave);

    //SNAPSHOT
    var node2 = tools_used.svg.append("g")
        .selectAll("dot")
        .data(data[0]).enter()
        .append("g")

    tools_used.dot2 = node2.append("path")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(200))
        .attr("transform", function (d) {
            var x = toolAxis('snapshot')
            return "translate(" + x(d.snapshot) + "," + (height - (height / 2) - 20) + ")";
        })

        //fill based on relationship to the mean
        .style("fill", function (d) {
            if (d.snapshot < class_avg("snapshot")) {
                return belowColorScale("snapshot", d.snapshot)
            }
            else { return aboveColorScale("snapshot", d.snapshot) }
        })
        .style("opacity", .8)

        //grey out non-clicked
        .on("click", function (d) {
            if (circle_clicked == false) {
                highlightStudent(data[0], d);
                circle_clicked = true;
            } else {
                circle_clicked = false;
                unhighlightStudent(data[1], d);
            }
        })
        .on("mouseover", mouseover)
        .on("mousemove", function (d) {
            Tooltip
                .html(d.user + " used this tool " + d["snapshot"].toFixed(2) + " times per puzzle, " + change(d, "snapshot") + " than average.")
                .style("left", (d3.mouse(this)[0] + 90) + "px")
                .style("top", (d3.mouse(this)[1] + 150) + "px")
        })
        .on("mouseleave", mouseleave);

    //ROTATE VIEW
    var node3 = tools_used.svg.append("g")
        .selectAll("circle")
        .data(data[0]).enter()
        .append("g")

    tools_used.dot3 = node3.append("path")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(200))
        .attr("transform", function (d) {
            var x = toolAxis('rotate_view')
            return "translate(" + x(d.rotate_view) + "," + (height - 75) + ")";
        })

        //fill based on relationship to the mean
        .style("fill", function (d) {
            if (d.rotate_view < class_avg("rotate_view")) {
                return belowColorScale("rotate_view", d.rotate_view)
            }
            else { return aboveColorScale("rotate_view", d.rotate_view) }
        })
        .style("opacity", 1)

        //grey out non-clicked
        .on("click", function (d) {
            if (circle_clicked == false) {
                highlightStudent(data[0], d);
                circle_clicked = true;
            } else {
                circle_clicked = false;
                unhighlightStudent(data[1], d);
            }
        })
        .on("mouseover", mouseover)
        .on("mousemove", function (d) {
            Tooltip
                .html(d.user + " used this tool " + d["rotate_view"].toFixed(2) + " times per puzzle, " + change(d, "rotate_view") + " than average.")
                .style("left", (d3.mouse(this)[0] + 90) + "px")
                .style("top", (d3.mouse(this)[1] + 275) + "px")
        })
        .on("mouseleave", mouseleave);

    return tools_used
}

function initActiveTime(data) {

    var active_link = "0"; //legend selections and hover
    var legendClicked; //legend selections
    var legendClassArray = []; //store legend classes to select bars in plotSingle()
    var legendClassArray_orig = [];
    var sortDescending; //if true, bars are sorted by height in descending order
    var restoreXFlag = false; //restore order of bars back to original

    var margin = { top: 10, right: 10, bottom: 50, left: 50 },
        width = 400 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom;

    d3.select("#active_time").selectAll("*").remove();

    //allocate space for viz
    var active_time = d3.select("#active_time")

    active_time.svg = active_time.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    d3.select(".detail").on("change", changeVis)

    function changeVis() { activeTime = initActiveTime(data); }

    //add patterns for detail vis
    active_time = addPatterns(active_time);

    var info = getVisInfo();

    //create bar chart data given detail selection
    data[0].forEach(function (d) {
        var user = d.user; //add to stock code
        var y0 = 0;
        d.time = info.color.domain().map(function (name) {
            var value = d[name]
            switch (name) {
                case "AT_1":
                    value = d["AT_1_P"] + d["AT_1_F"]
                    break;
                case "AT_2":
                    value = d["AT_2_P"] + d["AT_2_F"]
                    break;
                case "AT_3":
                    value = d["AT_3_P"] + d["AT_3_F"]
                    break;
            }
            return {
                user: user,
                name: name,
                y0: y0,
                y1: y0 += +value,
                value: value,
                total: d.active_time
            };
        });
        d.total = d.time[d.time.length - 1].y1;
    });

    //set x and y ranges
    var x = d3.scaleBand()
        .rangeRound([0, width])
        .padding(.15)

    var y = d3.scaleLinear()
        .rangeRound([height, 0]);

    //set x and y domains
    data[0].sort(function (a, b) { return -a.total + b.total; });
    x.domain(data[0].map(function (d) { return d.user; }));
    y.domain([0, d3.max(data[0], function (d) { return d.total; })])

    //set x and y axis
    var xAxis = d3.axisBottom(x).tickFormat(function (d) { return d; });
    var yAxis = d3.axisLeft(y).tickFormat(function (d) {
        // Hours, minutes and seconds
        var hrs = ~~(d / 3600);
        var mins = ~~((d % 3600) / 60);
        var secs = ~~d % 60;
        var ret = "";
        if (hrs > 0) {
            ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
        }
        ret += "" + mins + ":" + (secs < 10 ? "0" : "");
        ret += "" + secs;
        return ret;
    });

    //Draw x and y-axis
    active_time.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("dx", "-1.5em")
        .attr("dy", "0em")
        .attr("transform", "rotate(-65)")

    active_time.svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(0,0)")
        .call(yAxis);

    var bar_clicked = false;

    //create g for each user column (instead of specific time chunk)
    active_time.user = active_time.svg.selectAll(".user")
        .data(data[0])
        .enter().append("g")
        .attr("class", "g")
        .attr("id", function (d) { return d.user })
        .attr("transform", function (d) { return "translate(" + "0" + ",0)"; })

        //grey out non-clicked
        .on("click", function (d) {
            if (bar_clicked == false) {
                highlightStudent(data[0], d);

                bar_clicked = true;
            } else {
                unhighlightStudent(data[1], d);
                bar_clicked = false;
            }
        });

    // create a tooltip
    var Tooltip = d3.select("#active_time")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("height", "45px")
        .style("width", "200px")

    var mouseover = function (d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }
    var mousemove = function (d) {
        Tooltip
            .html(d.user + " spent " + (100 * (d.value / d.total)).toFixed(1) + "% of their time <br>" + vartoText(d.name) + " puzzles.")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY) - 100 + "px")
    }
    var mouseleave = function (d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    function vartoText(d) {

        switch (d) {
            case "AT_1": return "on easy"
            case "AT_2": return "on medium"
            case "AT_3": return "on hard"
            case "AT_1_P": return "completing easy"
            case "AT_2_P": return "completing medium"
            case "AT_3_P": return "completing hard"
            case "AT_1_F": return "on unfinished easy"
            case "AT_2_F": return "on unfinished medium"
            case "AT_3_F": return "on unfinished hard"
        }
    }

    //Draw Stacked Chart
    active_time.user.selectAll("rect")
        .data(function (d) {
            return d.time;
        })
        .enter().append("rect")
        .attr("width", x.bandwidth())
        .attr("y", function (d) {
            return y(d.y1);
        })
        .attr("x", function (d) { return x(d.user); })
        .attr("height", function (d) { return y(0) - y(d.value); })
        .attr("class", function (d) {
            return "bars class" + d.name.replace(/\s/g, '');
        })
        .style("fill", function (d) { return info.color(d.name); })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);


    //LEGEND
    var legend = active_time.svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data((info.keys).reverse())
        .enter().append("g")
        .attr("class", function (d) {
            legendClassArray.push(d);
            legendClassArray_orig.push(d);
            return "legend";
        })
        .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")"; });

    legendClassArray = legendClassArray.reverse();
    legendClassArray_orig = legendClassArray_orig.reverse();

    legend.append("rect")
        .attr("x", width - 19)
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", info.color)
        .attr("id", function (d, i) {
            return "id" + d;
        })
        .on("mouseover", function () {

            if (active_link === "0") d3.select(this).style("cursor", "pointer");
            else {
                if (active_link.split("class").pop() === this.id.split("id").pop()) {
                    d3.select(this).style("cursor", "pointer");
                } else d3.select(this).style("cursor", "auto");
            }
        })

        .on("click", function (d) {

            if (active_link === "0") { //nothing selected, turn on this selection
                d3.select(this)
                    .style("stroke", "black")
                    .style("stroke-width", 2);

                active_link = this.id.split("id").pop();
                plotSingle(this);

                //gray out the others
                for (i = 0; i < legendClassArray.length; i++) {
                    if (legendClassArray[i] != active_link) {
                        d3.select("#id" + legendClassArray[i])
                            .style("opacity", 0.5);
                    } else sortBy = i; //save index for sorting in change()
                }

                //enable sort checkbox
                d3.select(".sort").select("input").property("disabled", false)
                d3.select(".sort").style("color", "black")

                //sort the bars if checkbox is clicked            
                d3.select(".sort").select("input").on("change", changeSort);

            } else { //deactivate
                if (active_link === this.id.split("id").pop()) {//active square selected; turn it OFF
                    d3.select(this)
                        .style("stroke", "none");

                    //restore remaining boxes to normal opacity
                    for (i = 0; i < legendClassArray.length; i++) {
                        d3.select("#id" + legendClassArray[i])
                            .style("opacity", 1);
                    }


                    if (d3.select(".sort").select("input").property("checked")) {
                        restoreXFlag = true;
                    }

                    //disable sort checkbox
                    d3.select(".sort")
                        .style("color", "#D8D8D8")
                        .select("input")
                        .property("disabled", true)
                        .property("checked", false);

                    //sort bars back to original positions if necessary
                    changeSort();

                    //y translate selected category bars back to original y posn
                    restorePlot(d);

                    active_link = "0"; //reset
                }

            }
        });

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(function (d) {
            switch (d) {
                case "AT_1": return "Easy"
                case "AT_2": return "Medium"
                case "AT_3": return "Hard"
                case "AT_1_P": return "Easy"
                case "AT_2_P": return "Medium"
                case "AT_3_P": return "Hard"
                case "AT_1_F": return "Easy (unsuccessful)"
                case "AT_2_F": return "Medium (unsuccessful)"
                case "AT_3_F": return "Hard (unsuccessful)"
            }
        });

    function restorePlot(d) {

        //translate bars back up to original y-posn
        active_time.user.selectAll("rect")
            .attr("x", function (d) {
                return x(d.user);
            })
            .transition()
            .duration(1000)
            .delay(function () {
                if (restoreXFlag) return 2000; //bars have to be restored to orig posn
                else return 0;
            })
            .attr("y", function (d) { return y(d.y1); });

        //reset
        restoreXFlag = false;
    }

    function plotSingle(d) {

        class_keep = d.id.split("id").pop();
        idx = legendClassArray.indexOf(class_keep);

        //shift positioning of the bars  
        active_time.user.nodes().forEach(function (d, i) {

            var nodes = d.childNodes;

            //get height and y posn of base bar and selected bar
            h_keep = d3.select(nodes[idx]).attr("height");
            y_keep = d3.select(nodes[idx]).attr("y");

            h_base = d3.select(nodes[0]).attr("height");
            y_base = d3.select(nodes[0]).attr("y");

            h_shift = h_keep - h_base;
            y_new = y_base - h_shift;

            //reposition selected bars
            d3.select(nodes[idx])
                .transition()
                // .ease("bounce")
                .duration(750)
                .delay(750)
                .attr("y", y_new);

            for (var i = 0; i <= nodes.length - 1; i++) {

                //shift bars up if below the selected bar
                if (i < idx) {

                    y_curr = d3.select(nodes[i]).attr("y")

                    d3.select(nodes[i])
                        .transition()
                        // .ease("bounce")
                        .duration(750)
                        .delay(750)
                        .attr("y", y_curr - h_keep);
                }
            }
        });
    }

    function changeSort() {
        if (this.checked) sortDescending = true;
        else sortDescending = false;

        colName = legendClassArray_orig[sortBy];

        var x0 = x.domain(data[0].sort(sortDescending
            ? function (a, b) {

                var value = b[colName] - a[colName]
                switch (colName) {
                    case "AT_1":
                        value = (b["AT_1_P"] + b["AT_1_F"]) - (a["AT_1_P"] + a["AT_1_F"])
                        break;
                    case "AT_2":
                        value = (b["AT_2_P"] + b["AT_2_F"]) - (a["AT_2_P"] + a["AT_2_F"])
                        break;
                    case "AT_3":
                        value = (b["AT_3_P"] + b["AT_3_F"]) - (a["AT_3_P"] + a["AT_3_F"])
                        break;
                }

                return value;
            }
            : function (a, b) { return b.total - a.total; })
            .map(function (d, i) { return d.user; }))
            .copy();

        active_time.user.selectAll("rect")
            .sort(function (a, b) {
                return x0(a.user) - x0(b.user);
            });

        var transition = active_time.transition().duration(750),
            delay = function (d, i) { return i * 20; };

        active_time.user.selectAll("rect")
            .transition()
            .duration(750)
            .attr("x", function (d) {
                return x0(d.user);
            });

        //sort x-labels accordingly    
        transition.select(".x.axis")
            .call(xAxis)
            .selectAll("g")
            .delay(delay);
    }
    return active_time;
}

function initFailedAttempts(data) {

    var margin = { top: 20, right: 10, bottom: 65, left: 50 },
        width = 400 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    d3.select("#failed_attempts").selectAll("*").remove();

    //allocate space for scatterplot
    var failed_attempts = d3.select("#failed_attempts");

    failed_attempts.svg = failed_attempts.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var max_failed = d3.max(data[0], function (d) { return d.num_failed_att; })

    var x = d3.scaleLinear()
        .domain([0, 100])
        .range([0, width]);
    failed_attempts.svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x));

    var y = d3.scaleLinear()
        .domain([0, max_failed + 3])
        .range([height, 0]);
    failed_attempts.svg.append("g")
        .call(d3.axisLeft(y));

    var Tooltip = d3.select("#failed_attempts")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("height", "45px")
        .style("width", "200px")

    var mouseover = function (d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }
    var mousemove = function (d) {

        if (d.num_failed_att == 0)
            var ratio = 0
        else
            var ratio = Math.round((d.reattempts_AF / d.num_failed_att) * 100)

        if (d.num_failed_att == 0) {
            Tooltip
                .html(d.user + " did not fail any puzzles")
                .style("left", (d3.mouse(this)[0] + "px"))
                .style("top", (d3.mouse(this)[1] + "px"))
        }
        else {
            Tooltip
                .html(d.user + " reattempted " + ratio + "%, or " + d.reattempts_AF + "/" + d.num_failed_att + " failed attempts across " + d.num_failed_puzz + " puzzles")
                .style("left", (d3.mouse(this)[0] + "px"))
                .style("top", (d3.mouse(this)[1] + "px"))
        }

    }
    var mouseleave = function (d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    var circle_clicked = false;

    var node = failed_attempts.svg.append('g')
        .selectAll("dot")
        .data(data[0])
        .enter()

    failed_attempts.circle = node.append("circle")
        .attr("cx", function (d) {
            if (d.num_failed_att == 0)
                return x(0)
            else
                return x((d.reattempts_AF / d.num_failed_att) * 100);
        })
        .attr("cy", function (d) { return y(d.num_failed_att); })
        .attr("r", function (d) {
            return (d.per_score / 10)
        })
        .style("fill", "#FF8601")
        .style("opacity", .75)

        //grey out non-clicked
        .on("click", function (d) {
            if (circle_clicked == false) {
                highlightStudent(data[0], d);
                circle_clicked = true;
            } else {
                circle_clicked = false;
                unhighlightStudent(data[1], d);
            }
        })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);

    failed_attempts.svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", (width / 2) + 50)
        .attr("y", height + 50)
        .text("% reattempts after failure");

    failed_attempts.svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", -5)
        .attr("dy", "-3.5em")
        .attr("transform", "rotate(-90)")
        .text("Total failed attempts");

    return failed_attempts;

}

function initFailedAttemptsMap(data) {

    var margin = { top: 0, right: 10, bottom: 50, left: 30 },
        width = 400 - margin.left - margin.right,
        height = 70 - margin.top - margin.bottom;

    d3.select("#failed_attemptsMAP").selectAll("*").remove();

    //allocate space for heatmap viz
    var failed_attempts_map = d3.select("#failed_attemptsMAP");

    failed_attempts_map.svg = failed_attempts_map.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.scaleBand()
        .range([0, width])
        .domain(Object.keys(puzzle_categories))
        .padding(0.01);


    var y = d3.scaleBand()
        .range([0, height])
        .padding(0.01);

    var myColor = d3.scaleLinear()
        .range(["#d0ecf3", "#65C1DA"])
        .domain([0, d3.max(data, function (d) {
            return d.fails
        })])

    var easyColor = d3.scaleLinear()
        .range(["#d0ecf3", "#65C1DA"])
        .domain([0, d3.max(data, function (d) {
            return d.fails
        })])

    var medColor = d3.scaleLinear()
        .range(["#ffefb4", "#FFCC05"])
        .domain([0, d3.max(data, function (d) {
            return d.fails
        })])

    var hardColor = d3.scaleLinear()
        .range(["#feccdf", "#FC0160"])
        .domain([0, d3.max(data, function (d) {
            return d.fails
        })])

    var Tooltip = d3.select("#failed_attemptsMAP")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("height", "50px")
        .style("width", "200px")

    var mouseover = function (d) {
        Tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
    }

    var mousemove = function (d) {
        Tooltip
            .html(d.task_id + " was failed " + d.fails + " times and reattempted " + d.reattempts_AF + " times.")
            .style("left", (d3.mouse(this)[0] - 100 + "px"))
            .style("top", (d3.mouse(this)[1] + 300 + "px"))
    }

    var mouseleave = function (d) {
        Tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
    }

    var FailsMap = failed_attempts_map.svg.selectAll()
        .data(data)
        .enter().append("rect")
        .attr("x", function (d) { return x(d.task_id) })
        .attr("y", 0)
        .attr("width", x.bandwidth())
        .attr("height", height)
        .style("fill", function (d) {
            if (d.fails == 0) {
                return "#f7f7f7"
            } else {
                switch (puzzle_categories[d.task_id]) {
                    case 1: return easyColor(d.fails)
                    case 2: return medColor(d.fails)
                    case 3: return hardColor(d.fails)
                }
            }
        })
        // return myColor(d.fails)} )
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave);

    return failed_attempts_map;
}

function addPatterns(vis) {

    //Append patterns for successful/unsuccessful active time
    vis.svg.append('defs')
        .append('pattern')
        .attr('id', 'diagonalHatchE')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', '#65C1DA')
        .attr('stroke-width', 1);

    vis.svg.append('defs')
        .append('pattern')
        .attr('id', 'diagonalHatchM')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', '#FFCC05')
        .attr('stroke-width', 1);

    vis.svg.append('defs')
        .append('pattern')
        .attr('id', 'diagonalHatchH')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', '#FC0160')
        .attr('stroke-width', 1);

    vis.svg.append('defs')
        .append('pattern')
        .attr('id', 'diagonalHatchMAP')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', "red")
        .attr('stroke-width', 1);

    return vis;
}

function getVisInfo() {
    var keys;
    var color = d3.scaleOrdinal();
    var detail;

    if (d3.select(".detail").select("input").property("checked")) {
        detail = true;
        keys = ["AT_1_P", "AT_2_P", "AT_3_P", "AT_1_F", "AT_2_F", "AT_3_F"]
        color.domain(keys)
        color.range(["#65C1DA", "#FFCC05", "#FC0160", 'url(#diagonalHatchE)', 'url(#diagonalHatchM)', 'url(#diagonalHatchH)'])
    }
    // color.range(["#3F8FD2", "#3F8FD2", "#FFC000", "#FFC000", "#FF4C00", "#FF4C00"])}
    else {
        detail = false;
        keys = ["AT_1", "AT_2", "AT_3"]
        color.domain(keys)
        color.range(["#65C1DA", "#FFCC05", "#FC0160"])
    }

    return { detail: detail, keys: keys, color: color };
}

function highlightStudent(data, d) {

    document.getElementById("student_highlight").innerHTML = d.user

    // highlight heatmap in reattempts viz
    initFailedAttemptsMap(d.byPuzzle)

    //highlight scatterplot in reattempts viz
    var reattempt_circle_array = failedAttempts.circle._groups[0];

    for (var i = reattempt_circle_array.length - 1; i >= 0; i--) {
        if (reattempt_circle_array[i].__data__ != d) {
            d3.select(reattempt_circle_array[i])
                .style("opacity", .1)
        }
    }

    //highlight in tools used viz
    var dot_array = toolsUsedNEW.dot._groups[0];
    var dot2_array = toolsUsedNEW.dot2._groups[0];
    var dot3_array = toolsUsedNEW.dot3._groups[0];

    var tool1;
    var tool2;
    var tool3;

    //CHECK SOLUTIONS
    for (var i = dot_array.length - 1; i >= 0; i--) {
        if (dot_array[i].__data__ != d) {
            d3.select(dot_array[i])
                .style("opacity", .02)
        } else {
            tool1 = dot_array[i]
            d3.select(dot_array[i])
                .style("opacity", 1)
        }
    }

    //SNAPSHOT
    for (var i = dot2_array.length - 1; i >= 0; i--) {
        if (dot2_array[i].__data__ != d) {
            d3.select(dot2_array[i])
                .style("opacity", .02)
        } else {
            tool2 = dot2_array[i]
            d3.select(dot2_array[i])
                .style("opacity", 1)
        }
    }

    //ROTATE VIEW
    for (var i = dot3_array.length - 1; i >= 0; i--) {
        if (dot3_array[i].__data__ != d) {
            d3.select(dot3_array[i])
                .style("opacity", .02)
        } else {
            tool3 = dot3_array[i]
            d3.select(dot3_array[i])
                .style("opacity", 1)
        }
    }

    //highlight in bar chart
    var bar_array = activeTime.user._groups[0];

    for (var i = bar_array.length - 1; i >= 0; i--) {
        if (bar_array[i].__data__ != d) {
            d3.select(bar_array[i])
                .style("opacity", .1)
        }
    }
}

function unhighlightStudent(data, d) {

    document.getElementById("student_highlight").innerHTML = "None"
    d3.select("#tools_used").selectAll(".tool_highlight").remove();

    var reattempt_circle_array = failedAttempts.circle._groups[0];

    for (var i = reattempt_circle_array.length - 1; i >= 0; i--) {
        d3.select(reattempt_circle_array[i])
            .style("opacity", 1)
    }

    initFailedAttemptsMap(data)

    var dot_array = toolsUsedNEW.dot._groups[0];
    var dot2_array = toolsUsedNEW.dot2._groups[0];
    var dot3_array = toolsUsedNEW.dot3._groups[0];

    for (var i = dot_array.length - 1; i >= 0; i--) {
        d3.select(dot_array[i])
            .style("opacity", .7)
    }

    for (var i = dot2_array.length - 1; i >= 0; i--) {
        d3.select(dot2_array[i])
            .style("opacity", 1)
    }

    for (var i = dot3_array.length - 1; i >= 0; i--) {
        d3.select(dot3_array[i])
            .style("opacity", 1)
    }

    var bar_array = activeTime.user._groups[0];

    for (var i = bar_array.length - 1; i >= 0; i--) {
        d3.select(bar_array[i])
            .style("opacity", 1)
    }
}