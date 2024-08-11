const def_i3n3 = { label: "Type", tag:'i3.n3', start: 71, length: 6, getValue: (bits) => bitsToi3n3(bits) };
const def_i3 = { label: "Type", shortLabel:'i3', tag:'i3', start: 74, length: 3, getValue: (bits) => bitsToi3(bits) };

// note: don't use shortLabel if not needed to display on tribble bit display

const annotationDefinitions = {
    "0.0": [ // Free text
        { label: "Free text", tag:'f71', start: 0, length: 71, getValue: bitsToText },
        def_i3n3
    ],
    "0.1": [
        { label: "Call1", tag:'c28', start: 0, length: 28, getValue: bitsToCall},
        { label: "Call2", tag:'c28', start: 28, length: 28, getValue: bitsToCall },
        { label: "Hash", tag:'h10', start: 56, length: 10, getValue: bitsToHash },
        { label: "Report", tag:'r5', start: 66, length: 5, getValue: bitsToReport },
        def_i3n3
    ],
    "0.2": [ // EU VHF Contest (is this real?)
        { label: "Call1", tag:'c28', start: 0, length: 28, getValue: bitsToCall},
        { label: "Call2", tag:'c28', start: 28, length: 28, getValue: bitsToCall },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Serial", start: 57, length: 13, getValue: (bits) => placeholder(bits) },
        def_i3n3
    ],
    "0.3": [ // ARRL Field Day c28 c28 R1 n4 k3 S7
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "/R", shortLabel: 'R', tag:'R1', start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Number of transmitters", shortLabel: 'nTX', tag:'n4', start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits) },
        { label: "Class", tag:'', start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits) },
        def_i3n3
    ],
    "0.4": [ // ARRL Field Day (alternate format) c28 c28 R1 n4 k3 S7
        //n4 Number of transmitters: 1-16, 17-32
        //S7 ARRL/RAC Section
        { label: "Call1", tag:'c28', start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", tag:'c28', start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", tag:'R1', start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Number of transmitters", shortLabel: 'nTX', tag:'n4', start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits) },
        { label: "Class", start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits) },
        def_i3n3
    ],
    "0.5": [ // Telemetry
        { label: "Telemetry", start: 0, length: 71, getValue: (bits) => telemetryBitsToText(bits) },
        def_i3n3
    ],
    "1": [ // Standard message c28 r1 c28 r1 R1 g15
        { label: "Call1", tag:'c28', start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "/R for Call1", shortLabel:'r', tag:'r1', start: 28, length: 1, getValue: (bit) => bit === '1' ? '/R' : '' },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "/R for Call2", shortLabel:'r',  tag:'r1', start: 57, length: 1, getValue: (bit) => bit === '1' ? '/R' : '' },
        { shortLabel: 'R', tag:'R1', start: 58, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid/Report", tag:'g15', start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits) },
        def_i3
    ],
    "2": [ // EU VHF Contest c28 p1 c28 p1 R1 g15
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "/P for Call1", shortLabel:'p', tag:'p1', start: 28, length: 1, getValue: (bit) => bit === '1' ? '/P' : '' },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "/P for Call1", shortLabel:'p', tag:'p1', start: 57, length: 1, getValue: (bit) => bit === '1' ? '/P' : '' },
        { shortLabel: 'R', tag:'R1', start: 58, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid4", start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits) },
        def_i3
    ],
    "3": [ // ARRL RTTY Roundup
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "RST", start: 57, length: 3, getValue: (bits) => bitsToRST(bits) },
        { label: "Serial/State", start: 60, length: 14, getValue: (bits) => bitsToSerialOrState(bits) },
        def_i3
    ],
    "4": [ // Non-standard call: h12 c58 h1 r2 c1
        { label: "Hash", start: 0, length: 12, getValue: (bits) => bitsToHash(bits) },
        { label: "Nonstandard Call", start: 12, length: 58, getValue: (bits) => bitsToNonstandardCall(bits) },
        { label: "h", start: 70, length: 1, getValue: (bit) => bit === '1' ? '1 (Hash is second callsign)' : '0 (Hash is first callsign)' },
        { label: "r2", start: 71, length: 2, getValue: (bits) => bitsToR2(bits) },
        { label: "c", start: 73, length: 1, getValue: (bit) => bit === '1' ? '1 (First callsign is CQ. Ignore hash)' : '0' },
        def_i3
    ],
    "5": [ // EU VHF Contest with 6-digit grid locator
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid6", start: 57, length: 17, getValue: (bits) => bitsToGrid6(bits) },
        def_i3
    ]
};

function AnnotationDefGetValueText(annotation, payloadBits77) {
    const bits = payloadBits77.slice(annotation.start, annotation.start + annotation.length);
    return annotation.getValue(bits);
}

function bitToFlag(bit, on, off) {
    //TODO: return details including on and off values for description/diagram
    return bit === '1' ? on : off;
}

function AnnotationDefGetAnnotation(annotation, payloadBits77) {
    const bits = payloadBits77.slice(annotation.start, annotation.start + annotation.length);
    var value = annotation.getValue(bits);
    var rawIntValue = bitsToBigIntString(bits);
    if (typeof value === 'object') {
        return { ...annotation, ...value, bits, rawIntValue };
    } else if (typeof value === 'string') {
        return { ...annotation, value, bits, rawIntValue };
    }
}

function bitsToi3n3(bits) {
    if (bits.length !== 6) return placeholder(bits);

    const type = parseInt(bits.slice(0, 3), 2);
    const n3 = parseInt(bits.slice(3, 6), 2);
    const short = `${type}.${n3}`;
    const long = `${short} (${getFT8MessageTypeName(short)})`;
    return {short, long};
}
function bitsToi3(bits) {
    if (bits.length !== 3) return placeholder(bits);

    const short = parseInt(bits.slice(0, 3), 2).toString().toString();
    const long = `${short} (${getFT8MessageTypeName(short)})`;
    return {short, long};
}


//Placeholder for TODOs
function placeholder(bits) {
    const veryShort = parseInt(bits, 2).toString();
    const long = `${veryShort} (undefined value)`;
    const short = short + "*";
    const desc = 'No definition available for this data type. Integer value is shown.';

    return {short, long, veryShort, desc};
}

//Placeholder for TODOs
function placeholderText(bits) {
    //return `${parseInt(bits, 2).toString()} (undecoded value)`;
    return `${bitsToBigIntString(bits).toString()} (undecoded value)`;
    
}

//TODO
function bitsToGrid6(bits) {
    return placeholder(bits);
}

function bitsToHash(bits) {
    //return hashBitsPrettyHex(bits);
    return hashBitsPrettyZ32(bits);
}

//TODO
function bitsToSerialOrState(bits) {
    return placeholder(bits);
}
