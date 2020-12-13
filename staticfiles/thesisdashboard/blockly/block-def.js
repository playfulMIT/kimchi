export const blockDefinitions = [{
    "type": "and_condition",
    "message0": "%1 AND %2 %3",
    "args0": [
        {
            "type": "input_statement",
            "name": "condition1",
            // "check": [
            //     "condition",
            //     "and_condition",
            //     "or_condition"
            // ]
        },
        {
            "type": "input_dummy"
        },
        {
            "type": "input_statement",
            "name": "condition2",
            // "check": [
            //     "condition",
            //     "and_condition",
            //     "or_condition"
            // ]
        }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "colour": 260,
    "tooltip": "selects students that meet both conditions",
    "helpUrl": ""
},
{
    "type": "persistence",
    "message0": "persistence",
    "output": null,
    "colour": 330,
    "tooltip": "a student's persistence percentile score",
    "helpUrl": ""
},
{
    "type": "mins_played",
    "message0": "minutes played",
    "output": null,
    "colour": 330,
    "tooltip": "total minutes a student has played Shadowspect for",
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
                "persistence",
                "mins_played",
                "percentile"
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
    "previousStatement": null,
    "colour": 290,
    "tooltip": "condition for selecting students",
    "helpUrl": ""
},
{
    "type": "or_condition",
    "message0": "%1 OR %2 %3",
    "args0": [
        {
            "type": "input_statement",
            "name": "condition1",
            // "check": [
            //     "condition",
            //     "and_condition",
            //     "or_condition"
            // ]
        },
        {
            "type": "input_dummy"
        },
        {
            "type": "input_statement",
            "name": "condition2",
            // "check": [
            //     "condition",
            //     "and_condition",
            //     "or_condition"
            // ]
        }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "colour": 260,
    "tooltip": "selects students that meet one of the conditions",
    "helpUrl": ""
},
{
    "type": "percentile",
    "message0": "percentile  %1",
    "args0": [
        {
            "type": "input_value",
            "name": "variable",
            "check": [
                "persistence",
                "mins_played"
            ]
        }
    ],
    "output": null,
    "colour": 330,
    "tooltip": "percentile of a variable",
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
                "and",
                "or"
            ]
        }
    ],
    "inputsInline": true,
    "colour": 65,
    "tooltip": "selected students will form an alert group",
    "helpUrl": ""
}]

export function setBlockCodeGeneration() {
    Blockly.JavaScript['and_condition'] = function (block) {
        var statements_condition1 = Blockly.JavaScript.statementToCode(block, 'condition1');
        var statements_condition2 = Blockly.JavaScript.statementToCode(block, 'condition2');
        var code = `{"and": [${statements_condition1}, ${statements_condition2}]}`;
        return code;
    };

    Blockly.JavaScript['persistence'] = function (block) {
        var code = 'persistence';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['mins_played'] = function (block) {
        var code = 'mins_played';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['condition'] = function (block) {
        var value_variable = Blockly.JavaScript.valueToCode(block, 'variable', Blockly.JavaScript.ORDER_NONE);
        var dropdown_operator = block.getFieldValue('operator');
        var number_comp_val = block.getFieldValue('comp_val');
        var code = `["${value_variable}", "${dropdown_operator}", ${number_comp_val}]`;
        return code;
    };

    Blockly.JavaScript['or_condition'] = function (block) {
        var statements_condition1 = Blockly.JavaScript.statementToCode(block, 'condition1');
        var statements_condition2 = Blockly.JavaScript.statementToCode(block, 'condition2');
        var code = `{"or": [${statements_condition1}, ${statements_condition2}]}`;
        return code;
    };

    Blockly.JavaScript['percentile'] = function (block) {
        var value_variable = Blockly.JavaScript.valueToCode(block, 'variable', Blockly.JavaScript.ORDER_NONE);
        var code = value_variable + '_percentile';
        return [code, Blockly.JavaScript.ORDER_NONE];
    };

    Blockly.JavaScript['alert'] = function (block) {
        var statements_conditions = Blockly.JavaScript.statementToCode(block, 'conditions');
        var code = `{"type": "alert", "filter": ${statements_conditions}}`;
        return code;
    };
}