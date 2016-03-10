var running = false, programTimer = null;
$(function () {
    init();
});

(function($){
    $.fn.innerText = function(msg) {
        if (msg) {
            if (document.body.innerText) {
                for (var i in this) {
                    this[i].innerText = msg;
                }
            } else {
                for (var i in this) {
                    this[i].innerHTML.replace(/&amp;lt;br&amp;gt;/gi,"n").replace(/(&amp;lt;([^&amp;gt;]+)&amp;gt;)/gi, "");
                }
            }
            return this;
        } else {
            if (document.body.innerText) {
                return this[0].innerText;
            } else {
                return this[0].innerHTML.replace(/&amp;lt;br&amp;gt;/gi,"n").replace(/(&amp;lt;([^&amp;gt;]+)&amp;gt;)/gi, "");
            }
        }
    };
})(jQuery);

function init() {
    initMemory();
    initControls();
    compile();
}

function initMemory() {
    var table = $('#memory-table');
    for(var a = 0;a < 10;a++) {
        var tr = $('<tr></tr>');
        for(var b = 0;b < 10;b++) {
            var c = b + (a * 10);
            var td = $('<td id="memory-block-' + c + '"><input type="number" onblur="validateMemory(this)" value="0"><p>#' + c + '</p></td>')
            tr.append(td);
        }
        table.append(tr);
    }
}

function initControls() {
    $("#compile").click(function () {
        compile();
    });
    $('#compile-run').click(function () {
        compile();
        stop();
        running = true;
        run();
    });
    $('#stop').click(function () {
        stop();
    });
    $('#step').click(function () {
        run(fetchPC(), true);
    });
    var errorEl = $('#error-output');
    window.onerror = function (e) {
        errorEl.children().remove();
        errorEl.append('<p>' + e + '</p>');
    }
}

function fetchMemory(address) {
    address = parseInt(address) || 0;
    if(address > 99 || address < 0) {
        throw new Error("Invalid memory address to fetch " + address);
    }
    return parseInt($('#memory-block-' + address + " input").val()) || 0;
}
function fetchPC() {
    return parseInt($('#pc').val()) || 0;
}
function fetchAccumulator() {
    return parseInt($('#accumulator').val()) || 0;
}

function setAccumulator(newValue, fromElement) {
    newValue = parseInt(newValue) % 999 || 0;
    $('#accumulator').val(newValue);
}

function updateMemory(index, newValue, fromElement) {
    index = index || 0;
    newValue = newValue || 0;
    fromElement = fromElement || null;
    $('#memory-block-' + index + ' input').val(newValue);
}
function fetchInput() {
    return parseInt($('#input').val()) || 0;
}
function setOutput(newValue) {
    $('#output').val(parseInt(newValue) || 0);
}
function updateProgramCounter(newValue) {
    $('#pc').val(newValue);
    $('.code-line').removeClass("active");
    $('.code-line.line-' + newValue).addClass('active');
}

function disableEditing(diable) {
    disable = disable || true;
    $('#code').attr('contenteditable', disable == true ? "true" : "false");
}

function validateMemory(e) {
    var el = $(e);
    var value = el.val();
    if(value < -999) {
        value = -999;
    } else if(value > 999) {
        value = 999;
    } else {
        return;
    }
    el.val(value);
}

function compile() {
    $('#error-output').children().remove();
    var memoryAddress = 0, a, line, symbols = {};
    function isValidLabel(label) {
        return label.match(/^[a-zA-Z][^\W]+$/i) != null;
    }
    function resolveAddress(address) {
        address = address || 0;
        if(isFinite(address) && !isNaN(parseInt(address))) {
            return address;
        }
        if(isFinite(symbols[address])) {
            return parseInt(symbols[address]);
        } else {
            throw new Error("Could not resolve symbol " + address);
        }
    }
    function isNoArgOpCode(symbol) {
        return (symbol == 'inp' || symbol == 'out' || symbol == 'hlt');
    }
    function parseOpCode(memoryAddress, opCode, arg) {
        opCode = opCode || 'hlt';
        arg = parseInt(arg);
        if(opCode != 'dat' && !isNaN(arg)) {
            if(arg > 99 || arg < 0) {
                throw new Error("Invalid argument to instruction. Memory address must be below 99");
            }
        }
        switch(opCode) {
            case 'inp':
                updateMemory(memoryAddress, 901);
                break;
            case 'out':
                updateMemory(memoryAddress, 902);
                break;
            case 'hlt':
                updateMemory(memoryAddress, 0);
                break;
            case 'add':
                updateMemory(memoryAddress, 100 + arg);
                break;
            case 'sub':
                updateMemory(memoryAddress, 200 + arg);
                break;
            case 'sta':
            case 'sto':
                updateMemory(memoryAddress, 300 + arg);
                break;
            case 'lda':
                updateMemory(memoryAddress, 500 + arg);
                break;
            case 'bra':
                updateMemory(memoryAddress, 600 + arg);
                break;
            case 'brz':
                updateMemory(memoryAddress, 700 + arg);
                break;
            case 'brp':
                updateMemory(memoryAddress, 800 + arg);
                break;
            case 'dat':
                updateMemory(memoryAddress, arg);
                break;
        }
    }
    var codeEl = $('#code');
    var lines = codeEl.innerText().trim().toLowerCase().split("\n");

    var i = 0;
    codeEl[0].innerHTML = '';
    for(a = 0;a < lines.length;a++) {
        if(lines[a].trim() == "") {
            continue;
        }
        codeEl.append('<div class="code-line line-' + i++ + '">' + lines[a].trim().split(/[\W]+/gi).join(" ") + '\n</div>');
    }
    lines = codeEl.innerText().trim().toLowerCase().split("\n");
    for(a = 0;a < lines.length;a++) {
        line = lines[a].trim().split(/[\W]+/gi);
        if(!isValidLabel(line[0])) {
            continue;
        }
        if(line.length == 3) {
            symbols[line[0]] = a;
        } else if(line.length == 2 && isNoArgOpCode(line[1])) {
            symbols[line[0]] = a;
        }
    }
    for(a = 0;a < lines.length;a++) {
        line = lines[a].trim().split(/[\W]+/gi);
        switch(line.length) {
            default:
                throw new Error("Could not parse line" + (a+1));
            case 0:
                continue;
            case 1:
                if(isNoArgOpCode(line[0])) {
                    parseOpCode(memoryAddress++, line[0]);
                } else {
                    throw new Error("Invalid instruction on line " + (a + 1) + " " + line[0]);
                }
                break;
            case 3:
            case 2:
                if(isNoArgOpCode(line[1])) {
                    parseOpCode(memoryAddress++, line[1]);
                } else {
                    var command = line[line.length - 2];
                    var address = resolveAddress(line[line.length - 1]);
                    parseOpCode(memoryAddress++, command, address);
                }
                break;
        }
    }
}

function run(programCounter, step) {
    step = step || false;
    if(!step && !running) {
        return;
    }
    programCounter = parseInt(programCounter) || 0;
    console.log("Run at " + programCounter);
    updateProgramCounter(programCounter);
    var instruction = fetchMemory(programCounter++);
    switch(instruction.toString()[0]) {
        case '0':
            stop();
            return;
        case '1':
            setAccumulator(fetchAccumulator() + fetchMemory(instruction - 100));
            break;
        case '2':
            setAccumulator(fetchAccumulator() - fetchMemory(instruction - 200));
            break;
        case '3':
            updateMemory(instruction - 300, fetchAccumulator());
            break;
        case '4':
            throw new Error("Invalid operation 4xx");
            break;
        case '5':
            setAccumulator(fetchMemory(instruction - 500));
            break;
        case '6':
            programCounter = instruction - 600;
            break;
        case '7':
            programCounter = fetchAccumulator() == 0 ? programCounter = instruction - 700 : programCounter;
            break;
        case '8':
            programCounter = fetchAccumulator() > 0 ? programCounter = instruction - 800 : programCounter;
            break;
        case '9':
            if(instruction == 901) {
                setAccumulator(fetchInput());
            } else if(instruction = 902) {
                setOutput(fetchAccumulator());
            }
            break;
    }
    var speed = parseInt($('#speed').val());
    if(speed <= 0) {
        speed = 0.0001;
    }

    if(!step) {
        programTimer = setTimeout(run.bind(this, programCounter), 1000 / speed);
    } else {
        updateProgramCounter(programCounter);
    }
}

function stop() {
    if(running) {
        running = false;
        $('.code-line').removeClass("active");
        if(programTimer != null) {
            clearTimeout(programTimer);
        }
        console.log("Program stopped");
    }
}