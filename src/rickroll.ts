
export const RICK_ROLL_ASCII = [
    `
  O   
 /|\\  
 / \\  
`,
    `
 \\O/  
  |   
 / \\  
`,
    `
  O/  
 /|   
 / \\  
`,
    `
 \\O   
  |\\  
 / \\  
`
];

// Simple note frequencies for the chorus
// Never gonna give you up
// A4, B4, D5, B4, F#5, E5
// A4, B4, D5, B4, E5, D5, C#5, B4, A4
export const RICK_ROLL_NOTES = [
    { freq: 220, dur: 0.15 }, // A3
    { freq: 247, dur: 0.15 }, // B3
    { freq: 294, dur: 0.15 }, // D4
    { freq: 247, dur: 0.15 }, // B3
    { freq: 370, dur: 0.35 }, // F#4
    { freq: 330, dur: 0.35 }, // E4

    { freq: 0, dur: 0.1 },   // rest

    { freq: 220, dur: 0.15 }, // A3
    { freq: 247, dur: 0.15 }, // B3
    { freq: 294, dur: 0.15 }, // D4
    { freq: 247, dur: 0.15 }, // B3
    { freq: 330, dur: 0.35 }, // E4
    { freq: 294, dur: 0.35 }, // D4
    { freq: 277, dur: 0.15 }, // C#4
    { freq: 247, dur: 0.15 }, // B3
    { freq: 220, dur: 0.30 }, // A3

    { freq: 0, dur: 0.1 },   // rest

    // Never gonna make you cry
    { freq: 220, dur: 0.15 }, // A3
    { freq: 247, dur: 0.15 }, // B3
    { freq: 294, dur: 0.15 }, // D4
    { freq: 247, dur: 0.15 }, // B3
    { freq: 294, dur: 0.35 }, // D4
    { freq: 330, dur: 0.35 }, // E4
    { freq: 277, dur: 0.25 }, // C#4
    { freq: 247, dur: 0.25 }, // B3
    { freq: 220, dur: 0.40 }, // A3
];
// Total duration of RICK_ROLL_NOTES sequence
// Phrase 1: 1.3s, rest 0.1s, Phrase 2: 1.9s, rest 0.1s, Phrase 3: 2.2s = 5.6s
export const RICK_ROLL_TOTAL_DURATION = 5.6;

// Lyrics synced to music phrases, alternating sets every loop
// Each entry: [startTime (seconds into loop), lyric text]
export const RICK_ROLL_LYRICS_TIMED: { time: number, text: string }[][] = [
    // Set A (odd loops)
    [
        { time: 0.0, text: "NEVER GONNA GIVE YOU UP" },
        { time: 1.4, text: "NEVER GONNA LET YOU DOWN" },
        { time: 3.4, text: "NEVER GONNA RUN AROUND AND DESERT YOU" },
    ],
    // Set B (even loops)
    [
        { time: 0.0, text: "NEVER GONNA MAKE YOU CRY" },
        { time: 1.4, text: "NEVER GONNA SAY GOODBYE" },
        { time: 3.4, text: "NEVER GONNA TELL A LIE AND HURT YOU" },
    ]
];
