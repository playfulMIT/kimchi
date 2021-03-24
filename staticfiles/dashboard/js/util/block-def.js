export const blockDefinitions = (puzzleList) => [
    {
        "type": "percentile",
        "message0": "percentile  %1",
        "args0": [
            {
                "type": "input_value",
                "name": "variable",
                "check": [
                    "SingleMetric"
                ]
            }
        ],
        "output": "SingleMetric",
        "colour": 290,
        "tooltip": "percentile of a variable",
        "helpUrl": ""
    },
    {
        "type": "persistence",
        "message0": "persistence",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "a student's persistence percentile score",
        "helpUrl": ""
    },
    {
        "type": "mins_played",
        "message0": "active time (mins)",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "total minutes a student has played Shadowspect for",
        "helpUrl": ""
    },
    {
        "type": "completed_puzzles",
        "message0": "# puzzles completed",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the total number of puzzles a student has completed",
        "helpUrl": ""
    },
    {
        "type": "attempted_puzzles",
        "message0": "# puzzles attempted",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the total number of puzzles a student has attempted",
        "helpUrl": ""
    },
    {
        "type": "attempts_per_puzzle",
        "message0": "median # of attempts per puzzle attempted",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the median number of attempts per puzzle attempted",
        "helpUrl": ""
    },
    {
        "type": "total_time",
        "message0": "total time (mins)",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the total time a student has played for, in minutes",
        "helpUrl": ""
    },
    {
        "type": "snapshots",
        "message0": "total # of snapshots",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the total number of snapshots a student has taken",
        "helpUrl": ""
    },
    {
        "type": "rotate",
        "message0": "total # of rotations",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the total number of times a student has used the rotate tool",
        "helpUrl": ""
    },
    {
        "type": "percent_incorrect",
        "message0": "% incorrect",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the percentage of puzzles that a student has attempted but yet to solve correctly",
        "helpUrl": ""
    },
    {
        "type": "percent_incomplete",
        "message0": "% incomplete",
        "output": "SingleMetric",
        "colour": 330,
        "tooltip": "the percentage of puzzles that a student has opened but not submitted an attempt for",
        "helpUrl": ""
    },
    {
        "type": "condition",
        "message0": "%1 %2 %3 %4",
        "args0": [
            {
                "type": "input_value",
                "name": "variable",
                "check": [
                    "SingleMetric"
                ],
                "align": "CENTRE"
            },
            {
                "type": "field_dropdown",
                "name": "operator",
                "options": [
                    [
                        ">",
                        ">"
                    ],
                    [
                        ">=",
                        ">="
                    ],
                    [
                        "=",
                        "="
                    ],
                    [
                        "<=",
                        "<="
                    ],
                    [
                        "<",
                        "<"
                    ]
                ]
            },
            {
                "type": "input_dummy"
            },
            {
                "type": "field_number",
                "name": "comp_val",
                "value": 0,
                "min": 0
            }
        ],
        "inputsInline": true,
        "previousStatement": "CombiningStatement",
        "colour": 290,
        "tooltip": "condition for selecting students",
        "helpUrl": ""
    },
    {
        "type": "completed_specific",
        "message0": "completed puzzles %1 %2",
        "args0": [
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "NAME",
                "check": "Puzzle"
            }
        ],
        "previousStatement": "CombiningStatement",
        "colour": 290,
        "tooltip": "the puzzles a student has completed",
        "helpUrl": ""
    },
    {
        "type": "attempted_specific",
        "message0": "attempted puzzles %1 %2",
        "args0": [
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "NAME",
                "check": "Puzzle"
            }
        ],
        "previousStatement": "CombiningStatement",
        "colour": 290,
        "tooltip": "the puzzles a student has attempted",
        "helpUrl": ""
    },
    {
        "type": "puzzle",
        "message0": "%1",
        "args0": [
            {
                "type": "field_dropdown",
                "name": "puzzles",
                "options": puzzleList.map(v => [v, v])
            }
        ],
        "previousStatement": "Puzzle",
        "nextStatement": "Puzzle",
        "colour": 290,
        "tooltip": "represents a single puzzle",
        "helpUrl": ""
    },
    {
        "type": "not_condition",
        "message0": "NOT %1",
        "args0": [
            {
                "type": "input_statement",
                "name": "NAME",
                "check": [
                    "CombiningStatement",
                    "condition"
                ]
            }
        ],
        "previousStatement": "CombiningStatement",
        "colour": 260,
        "tooltip": "selects students that do not meet the condition",
        "helpUrl": ""
    },
    {
        "type": "and_condition",
        "message0": "%1 AND %2 %3",
        "args0": [
            {
                "type": "input_statement",
                "name": "condition1",
                "check": [
                    "CombiningStatement",
                    "condition"
                ]
            },
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "condition2",
                "check": [
                    "CombiningStatement",
                    "condition"
                ]
            }
        ],
        "inputsInline": true,
        "previousStatement": "CombiningStatement",
        "colour": 260,
        "tooltip": "selects students that meet both conditions",
        "helpUrl": ""
    },
    {
        "type": "or_condition",
        "message0": "%1 OR %2 %3",
        "args0": [
            {
                "type": "input_statement",
                "name": "condition1",
                "check": [
                    "CombiningStatement",
                    "condition"
                ]
            },
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "condition2",
                "check": [
                    "CombiningStatement",
                    "condition"
                ]
            }
        ],
        "inputsInline": true,
        "previousStatement": "CombiningStatement",
        "colour": 260,
        "tooltip": "selects students that meet one of the conditions",
        "helpUrl": ""
    },
    {
        "type": "alert",
        "message0": "Alert me of students who: %1 %2",
        "args0": [
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "conditions",
                "check": [
                    "condition",
                    "CombiningStatement"
                ]
            }
        ],
        "inputsInline": true,
        "colour": 65,
        "tooltip": "selected students will form an alert group",
        "helpUrl": ""
    },
    {
        "type": "filter",
        "message0": "Filter students who: %1 %2",
        "args0": [
            {
                "type": "input_dummy"
            },
            {
                "type": "input_statement",
                "name": "conditions",
                "check": [
                    "condition",
                    "CombiningStatement"
                ]
            }
        ],
        "inputsInline": true,
        "colour": 65,
        "tooltip": "selected students will form an filter group",
        "helpUrl": ""
    }]

export function setBlockCodeGeneration() {
    Blockly.JavaScript['completed_puzzles'] = function (block) {
        var code = 'completed_count';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['attempted_puzzles'] = function (block) {
        var code = 'attempted_count';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['persistence'] = function (block) {
        var code = 'persistence';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['mins_played'] = function (block) {
        var code = 'mins_played';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['attempts_per_puzzle'] = function (block) {
        var code = 'attempts_per_puzzle';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['total_time'] = function (block) {
        var code = 'total_time';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['snapshots'] = function (block) {
        var code = 'snapshots';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['rotate'] = function (block) {
        var code = 'rotate';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['percent_incomplete'] = function (block) {
        var code = 'percent_incomplete';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['percent_incorrect'] = function (block) {
        var code = 'percent_incorrect';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['percentile'] = function (block) {
        var value_variable = Blockly.JavaScript.valueToCode(block, 'variable', Blockly.JavaScript.ORDER_NONE);
        var code = value_variable + '_percentile';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['completed_specific'] = function (block) {
        var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
        var code = `["completed", [${statements_name.replace("\"\"", "\",\"")}]]`;
        return code;
    };

    Blockly.JavaScript['attempted_specific'] = function (block) {
        var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
        var code = `["attempted", [${statements_name.replace("\"\"", "\",\"")}]]`;
        return code;
    };

    Blockly.JavaScript['puzzle'] = function (block) {
        var dropdown_puzzles = block.getFieldValue('puzzles');
        var code = `"${dropdown_puzzles}"`;
        return code;
    };

    Blockly.JavaScript['condition'] = function (block) {
        var value_variable = Blockly.JavaScript.valueToCode(block, 'variable', Blockly.JavaScript.ORDER_NONE);
        var dropdown_operator = block.getFieldValue('operator');
        var number_comp_val = block.getFieldValue('comp_val');
        var code = `["${value_variable}", "${dropdown_operator}", ${number_comp_val}]`;
        return code;
    };

    Blockly.JavaScript['and_condition'] = function (block) {
        var statements_condition1 = Blockly.JavaScript.statementToCode(block, 'condition1');
        var statements_condition2 = Blockly.JavaScript.statementToCode(block, 'condition2');
        var code = `{"and": [${statements_condition1}, ${statements_condition2}]}`;
        return code;
    };

    Blockly.JavaScript['or_condition'] = function (block) {
        var statements_condition1 = Blockly.JavaScript.statementToCode(block, 'condition1');
        var statements_condition2 = Blockly.JavaScript.statementToCode(block, 'condition2');
        var code = `{"or": [${statements_condition1}, ${statements_condition2}]}`;
        return code;
    };

    Blockly.JavaScript['not_condition'] = function (block) {
        var statements_name = Blockly.JavaScript.statementToCode(block, 'NAME');
        var code = `{"not": [${statements_name}]}`;
        return code;
    };

    Blockly.JavaScript['alert'] = function (block) {
        var statements_conditions = Blockly.JavaScript.statementToCode(block, 'conditions');
        var code = `{"type": "alert", "filter": ${statements_conditions}}`;
        return code;
    };

    Blockly.JavaScript['filter'] = function (block) {
        var statements_conditions = Blockly.JavaScript.statementToCode(block, 'conditions');
        var code = `{"type": "filter", "filter": ${statements_conditions}}`;
        return code;
    };
}