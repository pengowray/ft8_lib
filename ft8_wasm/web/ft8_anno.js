const annotationDefinitions = {
    "0.0": [ // Free text
        { label: "Free text", start: 0, length: 71, getValue: (bits) => bitsToText(bits.slice(0, 71)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.0` }
    ],
    "0.1": [ // DXpedition mode: c28 c28 h10 r5
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)) },
        { label: "Hash", start: 56, length: 10, getValue: (bits) => bitsToHash(bits.slice(56, 66)) },
        { label: "Report", start: 66, length: 5, getValue: (bits) => bitsToReport(bits.slice(66, 71)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.1` }
    ],
    "0.2": [ // EU VHF Contest
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)).callsign },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)).callsign },
        { label: "R", start: 56, length: 1, getValue: (bits) => bits[56] === '1' ? 'R' : '' },
        { label: "Serial", start: 57, length: 13, getValue: (bits) => placeholder(bits.slice(57, 70)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.2` }
    ],
    "0.3": [ // ARRL Field Day
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)) },
        { label: "R", start: 56, length: 1, getValue: (bits) => bits[56] === '1' ? 'R' : '' },
        { label: "nTx", start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits.slice(57, 61)) },
        { label: "Class", start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits.slice(61, 64)) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits.slice(64, 71)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.4` }
    ],
    "0.4": [ // ARRL Field Day (alternate format) c28 c28 R1 n4 k3 S7
        //n4 Number of transmitters: 1-16, 17-32
        //S7 ARRL/RAC Section
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)) },
        { label: "R", start: 56, length: 1, getValue: (bits) => bits[56] === '1' ? 'R' : '' },
        { label: "nTx", start: 57, length: 4, getValue: (bits) => bitsToTxNumber(bits.slice(57, 61)) },
        { label: "Class", start: 61, length: 3, getValue: (bits) => bitsToFieldDayClass(bits.slice(61, 64)) },
        { label: "Section", start: 64, length: 7, getValue: (bits) => bitsToARRLSection(bits.slice(64, 71)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.4` }
    ],
    "0.5": [ // Telemetry
        { label: "Telemetry", start: 0, length: 71, getValue: (bits) => bitsToTelemetry(bits.slice(0, 71)) },
        { label: "i3.n3", start: 71, length: 6, getValue: (bits) => `0.5` }
    ],
    "1": [ // Standard message
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        //{ label: "r1", start: 28, length: 1, getValue: (bits) => placeholder(bits.slice(28, 29)) },
        { label: "r", start: 28, length: 1, getValue: (bits) => bits[28] === '1' ? '/R' : '' },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits.slice(29, 57)) },
        //{ label: "r1", start: 57, length: 1, getValue: (bits) => placeholder(bits.slice(57, 58)) },
        { label: "r", start: 57, length: 1, getValue: (bits) => bits[57] === '1' ? '/R' : '' },
        //{ label: "R", start: 58, length: 1, getValue: (bits) => placeholder(bits.slice(58, 59)) },
        { label: "R", start: 58, length: 1, getValue: (bits) => bits[58] === '1' ? 'R' : '' },
        { label: "Grid/Report", start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits.slice(59, 74)) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `1` }
    ],
    "2": [ // EU VHF Contest
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 29, length: 28, getValue: (bits) => bitsToCall(bits.slice(29, 57)) },
        { label: "R", start: 58, length: 1, getValue: (bits) => bits[58] === '1' ? 'R' : '' },
        { label: "Grid4", start: 59, length: 15, getValue: (bits) => bitsToGrid4OrReportWithType(bits.slice(59, 74)) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `2` }
    ],
    "3": [ // ARRL RTTY Roundup
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)) },
        { label: "R", start: 56, length: 1, getValue: (bits) => bits[56] === '1' ? 'R' : '' },
        { label: "RST", start: 57, length: 3, getValue: (bits) => bitsToRST(bits.slice(57, 60)) },
        { label: "Serial/State", start: 60, length: 14, getValue: (bits) => bitsToSerialOrState(bits.slice(60, 74)) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `3` }
    ],
    "4": [ // Non-standard call: h12 c58 h1 r2 c1
        { label: "Hash", start: 0, length: 12, getValue: (bits) => bitsToHash(bits.slice(0, 12)) },
        { label: "Nonstandard Call", start: 12, length: 58, getValue: (bits) => bitsToNonstandardCall(bits.slice(12, 70)) },
        { label: "h", start: 70, length: 1, getValue: (bits) => bits[70] === '1' ? '1 (Hash is second callsign)' : '0 (Hash is first callsign)' },
        { label: "r2", start: 71, length: 2, getValue: (bits) => bitsToR2(bits.slice(71, 73)) },
        { label: "c", start: 73, length: 1, getValue: (bits) => bits[70] === '1' ? '1 (First callsign is CQ. Ignore hash)' : '0' },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `4` }
    ],
    "5": [ // EU VHF Contest with 6-digit grid locator
        { label: "Call1", start: 0, length: 28, getValue: (bits) => bitsToCall(bits.slice(0, 28)) },
        { label: "Call2", start: 28, length: 28, getValue: (bits) => bitsToCall(bits.slice(28, 56)) },
        { label: "R", start: 56, length: 1, getValue: (bits) => bits[56] === '1' ? 'R' : '' },
        { label: "Grid6", start: 57, length: 17, getValue: (bits) => bitsToGrid6(bits.slice(57, 74)) },
        { label: "i3", start: 74, length: 3, getValue: (bits) => `5` }
    ]
};

//TODO

function bitsToTelemetry(bits) {
    return telemetryToText(bits);
}

function bitsToGrid6(bits) {
    return placeholder(bits);
}

function bitsToHash(bits) {
    // if (bits.length == 22) return hashBits22styleBase10(bits); // 
    //return hashBitsPrettyHex(bits);
    return hashBitsPrettyZ32(bits);
    
}
function bitsToSerialOrState(bits) {
    return placeholder(bits);
}
function placeholder(bits) {
    return `${parseInt(bits, 2).toString()} (undecoded value)`;
}
