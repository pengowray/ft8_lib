const annotationDefinitions = {
    "0.0": [ // Free text
        { label: "Free text", start: 0, length: 71, getValue: (bits) => bitsToText(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.0` }
    ],
    "0.1": [ // DXpedition mode: c28 c28 h10 r5
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits)},
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Hash", start: 56, length: 10, getValue: (bits) => bitsToHash(bits) },
        { label: "Report", start: 66, length: 5, getValue: (bits) => bitsToReport(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.1` }
    ],
    "0.2": [ // EU VHF Contest
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits).callsign },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits).callsign },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Serial", start: 57, length: 13, getValue: (bits) => placeholder(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.2` }
    ],
    "0.3": [ // ARRL Field Day
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "nTx", start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits) },
        { label: "Class", start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.4` }
    ],
    "0.4": [ // ARRL Field Day (alternate format) c28 c28 R1 n4 k3 S7
        //n4 Number of transmitters: 1-16, 17-32
        //S7 ARRL/RAC Section
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "nTx", start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits) },
        { label: "Class", start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.4` }
    ],
    "0.5": [ // Telemetry
        { label: "Telemetry", start: 0, length: 71, getValue: (bits) => telemetryBitsToText(bits) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.5` }
    ],
    "1": [ // Standard message
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "r", start: 28, length: 1, getValue: (bit) => bit === '1' ? '/R' : '' },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "r", start: 57, length: 1, getValue: (bit) => bit === '1' ? '/R' : '' },
        { label: "R", start: 58, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid/Report", start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `1` }
    ],
    "2": [ // EU VHF Contest
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 58, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid4", start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `2` }
    ],
    "3": [ // ARRL RTTY Roundup
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "RST", start: 57, length: 3, getValue: (bits) => bitsToRST(bits) },
        { label: "Serial/State", start: 60, length: 14, getValue: (bits) => bitsToSerialOrState(bits) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `3` }
    ],
    "4": [ // Non-standard call: h12 c58 h1 r2 c1
        { label: "Hash", start: 0, length: 12, getValue: (bits) => bitsToHash(bits) },
        { label: "Nonstandard Call", start: 12, length: 58, getValue: (bits) => bitsToNonstandardCall(bits) },
        { label: "h", start: 70, length: 1, getValue: (bit) => bit === '1' ? '1 (Hash is second callsign)' : '0 (Hash is first callsign)' },
        { label: "r2", start: 71, length: 2, getValue: (bits) => bitsToR2(bits) },
        { label: "c", start: 73, length: 1, getValue: (bit) => bit === '1' ? '1 (First callsign is CQ. Ignore hash)' : '0' },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `4` }
    ],
    "5": [ // EU VHF Contest with 6-digit grid locator
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits) },
        { label: "R", start: 56, length: 1, getValue: (bit) => bit === '1' ? 'R' : '' },
        { label: "Grid6", start: 57, length: 17, getValue: (bits) => bitsToGrid6(bits) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `5` }
    ]
};

function DefinitionGetValue(annotation, payloadBits77) {
    const bits = payloadBits77.slice(annotation.start, annotation.start + annotation.length);
    return annotation.getValue(bits);
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

//Placeholder for TODOs
function placeholder(bits) {
    return `${parseInt(bits, 2).toString()} (undecoded value)`;
}
