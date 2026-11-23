import { LevelDef } from '../types/game';

export const LEVELS: LevelDef[] = [
  {
    id: 'ch1-1',
    number: 1,
    chapter: 'Chapter 1 · Sequences',
    title: 'First Roll',
    concept: 'Sequential Commands',
    objective: 'Collect the energy crystal and park Aurora on the green extraction beacon.',
    briefing:
      'Python runs instructions one line at a time from top to bottom. Use move() to drive forward 1 tile and collect() to pick up a crystal.',
    gridWidth: 7,
    gridHeight: 5,
    start: { x: 1, y: 2, dir: 1 },
    goal: { x: 5, y: 2 },
    walls: [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ],
    gems: [{ x: 3, y: 2 }],
    hazards: [],
    parLines: 5,
    starterCode: `# Guide Aurora to the crystal and green beacon
move()
move()
# Call collect() here, then move to (5, 2)
`,
    hints: [
      'Aurora starts at (1, 2) facing East. Two move() calls bring her to (3, 2) right on top of the crystal.',
      'Call collect() to pick up the crystal, then call move() two more times (or move(2)) to reach (5, 2).',
    ],
    snippets: [
      { label: 'move()', insert: 'move()' },
      { label: 'collect()', insert: 'collect()' },
      { label: 'print(...)', insert: 'print("Ready!")' },
    ],
  },
  {
    id: 'ch1-2',
    number: 2,
    chapter: 'Chapter 1 · Sequences',
    title: 'Corner Turn',
    concept: 'Rotation & Multi-Step Move',
    objective: 'Navigate the L-shaped corridor, collect the crystal, and reach the beacon.',
    briefing:
      'Aurora can rotate 90 degrees with turn_left() or turn_right(). You can also pass a number to move(steps), like move(3), to advance multiple tiles.',
    gridWidth: 7,
    gridHeight: 6,
    start: { x: 1, y: 4, dir: 0 },
    goal: { x: 5, y: 1 },
    walls: [
      { x: 2, y: 4 },
      { x: 2, y: 3 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ],
    gems: [{ x: 1, y: 1 }],
    hazards: [],
    parLines: 4,
    starterCode: `# Aurora starts facing North
move(3)
collect()
# Turn right and move to the beacon
`,
    hints: [
      'After move(3) and collect(), Aurora is at (1, 1) facing North.',
      'Call turn_right() to face East, then move(4) to reach (5, 1).',
    ],
    snippets: [
      { label: 'move(4)', insert: 'move(4)' },
      { label: 'turn_right()', insert: 'turn_right()' },
      { label: 'turn_left()', insert: 'turn_left()' },
      { label: 'collect()', insert: 'collect()' },
    ],
  },
  {
    id: 'ch2-1',
    number: 3,
    chapter: 'Chapter 2 · For Loops',
    title: 'Crystal Runway',
    concept: 'for i in range(n):',
    objective: 'Harvest all 5 crystals in a single loop and reach the extraction beacon.',
    briefing:
      'Instead of repeating move() and collect() five times, use a for loop. Every indented line inside the loop runs once per step.',
    gridWidth: 9,
    gridHeight: 5,
    start: { x: 1, y: 2, dir: 1 },
    goal: { x: 7, y: 2 },
    walls: [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 5, y: 1 },
      { x: 6, y: 1 },
      { x: 7, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ],
    gems: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
      { x: 6, y: 2 },
    ],
    hazards: [],
    parLines: 4,
    starterCode: `for i in range(5):
    move()
    # Collect the crystal on each tile

# One final move onto the beacon
`,
    hints: [
      'Indent collect() with 4 spaces inside the for loop so it runs on every tile.',
      'After the loop finishes (unindented), add move() to step onto (7, 2).',
    ],
    snippets: [
      { label: 'for i in range(5):', insert: 'for i in range(5):\n    ' },
      { label: 'move()', insert: 'move()' },
      { label: 'collect()', insert: 'collect()' },
    ],
  },
  {
    id: 'ch2-2',
    number: 4,
    chapter: 'Chapter 2 · For Loops',
    title: 'Staircase Protocol',
    concept: 'Multi-Step Loop Patterns',
    objective: 'Climb the 3 blueprint stairs, gathering every crystal on your way to the top.',
    briefing:
      'Spot the repeating pattern: move North onto a crystal, collect it, turn East, step across, and turn North again.',
    gridWidth: 7,
    gridHeight: 7,
    start: { x: 1, y: 5, dir: 0 },
    goal: { x: 4, y: 2 },
    walls: [
      { x: 0, y: 4 },
      { x: 0, y: 3 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 5 },
      { x: 3, y: 4 },
      { x: 4, y: 3 },
    ],
    gems: [
      { x: 1, y: 4 },
      { x: 2, y: 3 },
      { x: 3, y: 2 },
    ],
    hazards: [],
    parLines: 6,
    starterCode: `for step in range(3):
    move()
    collect()
    # Turn right, move across, then turn left to face North again
`,
    hints: [
      'Inside the loop after collect(), add: turn_right(), move(), and turn_left().',
      'Watch the Variables tab while stepping to see how step changes from 0 to 1 to 2!',
    ],
    snippets: [
      { label: 'turn_right()', insert: 'turn_right()' },
      { label: 'turn_left()', insert: 'turn_left()' },
      { label: 'move()', insert: 'move()' },
      { label: 'collect()', insert: 'collect()' },
    ],
  },
  {
    id: 'ch3-1',
    number: 5,
    chapter: 'Chapter 3 · Variables',
    title: 'Expanding Spiral',
    concept: 'Variables & += Arithmetic',
    objective: 'Follow the expanding spiral path by updating a steps variable after each turn.',
    briefing:
      'Variables store numbers that can change while your code runs. Try setting steps = 1, moving by steps, and increasing it with steps += 1.',
    gridWidth: 7,
    gridHeight: 7,
    start: { x: 3, y: 3, dir: 1 },
    goal: { x: 1, y: 5 },
    walls: [
      { x: 2, y: 3 },
      { x: 3, y: 2 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
      { x: 3, y: 4 },
    ],
    gems: [
      { x: 4, y: 3 },
      { x: 4, y: 1 },
      { x: 1, y: 1 },
    ],
    hazards: [],
    parLines: 7,
    starterCode: `steps = 1
for side in range(3):
    move(steps)
    collect()
    turn_left()
    steps += 1

# Move the final distance (steps is now 4!)
`,
    hints: [
      'On side 0, 1, and 2, Aurora moves 1, 2, and 3 tiles collecting all 3 crystals.',
      'After the loop ends, steps equals 4. Add move(steps) at the bottom to reach (1, 5).',
    ],
    snippets: [
      { label: 'steps = 1', insert: 'steps = 1' },
      { label: 'steps += 1', insert: 'steps += 1' },
      { label: 'move(steps)', insert: 'move(steps)' },
    ],
  },
  {
    id: 'ch3-2',
    number: 6,
    chapter: 'Chapter 3 · Variables',
    title: 'Laser Gate Calibration',
    concept: 'Switches, Gates & print()',
    objective: 'Drive over the amber switch plate to disable the laser gate, grab both crystals, and reach the beacon.',
    briefing:
      'Stepping onto a pressure switch automatically powers down its linked laser barrier. Use print() to log Aurora’s energy_left() to the Console.',
    gridWidth: 8,
    gridHeight: 6,
    start: { x: 1, y: 4, dir: 1 },
    goal: { x: 7, y: 2 },
    walls: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
    ],
    gems: [
      { x: 3, y: 2 },
      { x: 6, y: 2 },
    ],
    hazards: [{ x: 1, y: 2 }],
    gates: [{ id: 'g1', x: 5, y: 2, switchPos: { x: 3, y: 4 } }],
    parLines: 9,
    starterCode: `# Step 1: Move East onto the switch at (3, 4)
move(2)
print("Gate open! Energy:", energy_left())

# Step 2: Turn North to (3, 2), collect, then head East through (5, 2)
`,
    hints: [
      'From (3, 4), turn_left() faces North. move(2) brings Aurora to (3, 2) where the first crystal sits.',
      'After collect(), turn_right() to face East, then move(3) to (6, 2), collect(), and move() to (7, 2).',
    ],
    snippets: [
      { label: 'print(energy_left())', insert: 'print(energy_left())' },
      { label: 'move(2)', insert: 'move(2)' },
      { label: 'turn_left()', insert: 'turn_left()' },
      { label: 'turn_right()', insert: 'turn_right()' },
    ],
  },
  {
    id: 'ch4-1',
    number: 7,
    chapter: 'Chapter 4 · Conditionals',
    title: 'Sensor Corridor',
    concept: 'while, if / else & Wall Sensors',
    objective: 'Guide Aurora through the winding corridor using wall_ahead() and wall_right() — no hardcoded distances!',
    briefing:
      'Sensors let Aurora react to her surroundings: wall_ahead(), wall_left(), and wall_right() return True or False. Combine them with while not at_goal():!',
    gridWidth: 8,
    gridHeight: 7,
    start: { x: 1, y: 5, dir: 0 },
    goal: { x: 6, y: 5 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 7, y: 1 },
      { x: 0, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 7, y: 2 },
      { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 7, y: 3 },
      { x: 0, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 7, y: 4 },
      { x: 0, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 7, y: 5 },
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 }, { x: 7, y: 6 },
    ],
    gems: [{ x: 4, y: 3 }],
    hazards: [],
    parLines: 9,
    starterCode: `while not at_goal():
    if gem_here():
        collect()
    if wall_ahead():
        if not wall_right():
            turn_right()
        else:
            turn_left()
    else:
        move()
`,
    hints: [
      'Notice the starter algorithm! Step through it with F10 to watch how Aurora checks gem_here() and wall_ahead() at every tile.',
      'You can also trim lines or add print("Corner!") inside the wall_ahead() branch to trace each turn.',
    ],
    snippets: [
      { label: 'while not at_goal():', insert: 'while not at_goal():\n    ' },
      { label: 'if wall_ahead():', insert: 'if wall_ahead():\n    ' },
      { label: 'if gem_here():', insert: 'if gem_here():\n    collect()' },
    ],
  },
  {
    id: 'ch4-2',
    number: 8,
    chapter: 'Chapter 4 · Conditionals',
    title: 'Thermal Bypass',
    concept: 'hazard_ahead() Avoidance',
    objective: 'Cross the thermal sector by detouring around hazards and collecting the overhead crystals.',
    briefing:
      'Red thermal vents destroy the rover on contact. Check hazard_ahead() before moving so Aurora automatically steers around danger.',
    gridWidth: 8,
    gridHeight: 5,
    start: { x: 1, y: 2, dir: 1 },
    goal: { x: 6, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }, { x: 7, y: 4 },
    ],
    gems: [
      { x: 3, y: 1 },
      { x: 5, y: 1 },
    ],
    hazards: [
      { x: 3, y: 2 },
      { x: 5, y: 2 },
    ],
    parLines: 11,
    starterCode: `while not at_goal():
    if hazard_ahead():
        # Step North, cross over the hazard, collect(), and step back South
        turn_left()
        move()
        turn_right()
        move()
        collect()
        move()
        turn_right()
        move()
        turn_left()
    else:
        move()
`,
    hints: [
      'When hazard_ahead() is True, stepping North -> East 2 tiles -> South puts Aurora cleanly on the far side of the vent.',
      'Step through once with F10 to see how both vents at (3, 2) and (5, 2) are bypassed by the exact same if block!',
    ],
    snippets: [
      { label: 'if hazard_ahead():', insert: 'if hazard_ahead():\n    ' },
      { label: 'if gem_here():', insert: 'if gem_here():\n    collect()' },
      { label: 'while not at_goal():', insert: 'while not at_goal():\n    ' },
    ],
  },
  {
    id: 'ch5-1',
    number: 9,
    chapter: 'Chapter 5 · Functions',
    title: 'Subroutine Vault',
    concept: 'Defining Functions (def)',
    objective: 'Write a reusable function to raid each crystal alcove and reach the exit beacon.',
    briefing:
      'Use def my_func(): to package a sequence of steps into your own Python command. Call it multiple times to keep your code clean and concise.',
    gridWidth: 8,
    gridHeight: 6,
    start: { x: 0, y: 4, dir: 1 },
    goal: { x: 7, y: 4 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 3, y: 1 }, { x: 5, y: 1 }, { x: 7, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 3, y: 2 }, { x: 5, y: 2 }, { x: 7, y: 2 },
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 3 }, { x: 7, y: 3 },
      { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
    ],
    gems: [
      { x: 2, y: 1 },
      { x: 4, y: 1 },
      { x: 6, y: 1 },
    ],
    hazards: [],
    parLines: 11,
    starterCode: `def raid_alcove():
    turn_left()
    move(3)
    collect()
    turn_left()
    turn_left()
    move(3)
    turn_left()

for i in range(3):
    move(2)
    # Call your function here!

move()
`,
    hints: [
      'Inside the for loop after move(2), call raid_alcove() to enter the alcove, grab the gem, and return facing East.',
      'You can also define def turn_around(): turn_left(); turn_left() as a helper!',
    ],
    snippets: [
      { label: 'def helper():', insert: 'def helper():\n    ' },
      { label: 'raid_alcove()', insert: 'raid_alcove()' },
      { label: 'for i in range(3):', insert: 'for i in range(3):\n    ' },
    ],
  },
  {
    id: 'ch5-2',
    number: 10,
    chapter: 'Chapter 5 · Functions',
    title: 'Sentry Timing',
    concept: 'Patrol Timing with wait()',
    objective: 'Cross past two patrolling sentry drones using hazard_ahead() and wait().',
    briefing:
      'Sentry drones advance 1 tile each time Aurora moves or calls wait(). Check hazard_ahead() inside a loop to pause safely before crossing a patrol lane.',
    gridWidth: 8,
    gridHeight: 5,
    start: { x: 1, y: 2, dir: 1 },
    goal: { x: 6, y: 2 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 },
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 },
      { x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 3 }, { x: 4, y: 4 },
      { x: 6, y: 0 }, { x: 6, y: 1 }, { x: 6, y: 3 }, { x: 6, y: 4 },
      { x: 7, y: 0 }, { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 },
    ],
    gems: [
      { x: 3, y: 2 },
      { x: 5, y: 2 },
    ],
    hazards: [],
    drones: [
      {
        id: 'd1',
        path: [
          { x: 3, y: 0 },
          { x: 3, y: 1 },
          { x: 3, y: 2 },
          { x: 3, y: 3 },
          { x: 3, y: 4 },
        ],
        startIndex: 1,
      },
      {
        id: 'd2',
        path: [
          { x: 5, y: 0 },
          { x: 5, y: 1 },
          { x: 5, y: 2 },
          { x: 5, y: 3 },
          { x: 5, y: 4 },
        ],
        startIndex: 2,
      },
    ],
    parLines: 7,
    starterCode: `while not at_goal():
    if hazard_ahead():
        wait()
    else:
        move()
        if gem_here():
            collect()
`,
    hints: [
      'When hazard_ahead() is True, wait() lets the drone pass while Aurora holds position.',
      'Step slowly with F10 to watch the drones shift each tick when move() or wait() runs!',
    ],
    snippets: [
      { label: 'wait()', insert: 'wait()' },
      { label: 'if hazard_ahead():', insert: 'if hazard_ahead():\n    wait()' },
      { label: 'if gem_here():', insert: 'if gem_here():\n    collect()' },
    ],
  },
  {
    id: 'ch6-1',
    number: 11,
    chapter: 'Chapter 6 · Lists & Mastery',
    title: 'Command Tape',
    concept: 'Lists & String Commands',
    objective: 'Complete the command list so Aurora executes every instruction in order.',
    briefing:
      'In Python, lists store ordered sequences like ["M", "L", "C"]. Loop over a list with for cmd in route: and dispatch actions using if / elif!',
    gridWidth: 8,
    gridHeight: 6,
    start: { x: 1, y: 4, dir: 1 },
    goal: { x: 5, y: 4 },
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
      { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 4 },
    ],
    gems: [
      { x: 3, y: 4 },
      { x: 3, y: 2 },
    ],
    hazards: [{ x: 2, y: 2 }],
    parLines: 12,
    starterCode: `# M = move, L = turn_left, R = turn_right, C = collect
route = ["M", "M", "C", "L", "M", "M", "C", "R"]
# Add the final moves/turns to reach (5, 4): e.g. + ["M", "M", "R", "M", "M"]

for cmd in route:
    if cmd == "M":
        move()
    elif cmd == "L":
        turn_left()
    elif cmd == "R":
        turn_right()
    elif cmd == "C":
        collect()
`,
    hints: [
      'After the initial route finishes, Aurora is at (3, 2) facing East.',
      'Append ["M", "M", "R", "M", "M"] to route (or extend the list directly) to reach (5, 4)!',
    ],
    snippets: [
      { label: 'route.append("M")', insert: 'route.append("M")' },
      { label: 'elif cmd == "M":', insert: 'elif cmd == "M":\n    move()' },
    ],
  },
  {
    id: 'ch6-2',
    number: 12,
    chapter: 'Chapter 6 · Lists & Mastery',
    title: 'The Aurora Gauntlet',
    concept: 'Boss Challenge — All Skills',
    objective: 'Trigger the switch, cross the sentry patrol lane, collect all 3 crystals, and reach the extraction pad.',
    briefing:
      'Final Sector Test! Combine functions, loops, sensors, and wait() timing to solve the entire blueprint facility.',
    gridWidth: 9,
    gridHeight: 7,
    start: { x: 1, y: 1, dir: 2 },
    goal: { x: 7, y: 5 },
    walls: [
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 6 },
      { x: 6, y: 2 }, { x: 6, y: 4 },
    ],
    gems: [
      { x: 2, y: 5 },
      { x: 4, y: 3 },
      { x: 7, y: 1 },
    ],
    hazards: [
      { x: 3, y: 1 },
      { x: 3, y: 6 },
    ],
    gates: [{ id: 'boss-gate', x: 5, y: 3, switchPos: { x: 2, y: 5 } }],
    drones: [
      {
        id: 'boss-drone',
        path: [
          { x: 4, y: 1 },
          { x: 4, y: 2 },
          { x: 4, y: 3 },
          { x: 4, y: 4 },
          { x: 4, y: 5 },
        ],
        startIndex: 2,
      },
    ],
    maxEnergy: 60,
    parLines: 18,
    starterCode: `def safe_move(steps):
    for i in range(steps):
        while hazard_ahead():
            wait()
        move()
        if gem_here():
            collect()

# 1. Head South to (1, 5), then East to switch & gem at (2, 5)
safe_move(4)
turn_left()
safe_move(2)
# 2. Head North to (3, 3), cross sentry lane through gate (5, 3) to (7, 3)
# 3. Grab crystal at (7, 1), then descend to goal at (7, 5)!
`,
    hints: [
      'After safe_move(2), Aurora is at (3, 5) facing East. Turn left (North), safe_move(2) to (3, 3), then turn_right() to face East.',
      'From (3, 3) facing East: safe_move(4) crosses the drone at (4, 3) and the open gate (5, 3) to reach (7, 3)!',
      'At (7, 3), turn_left(), safe_move(2) to grab (7, 1), then turn_left(); turn_left(); safe_move(4) to reach (7, 5)!',
    ],
    snippets: [
      { label: 'safe_move(4)', insert: 'safe_move(4)' },
      { label: 'turn_left()', insert: 'turn_left()' },
      { label: 'turn_right()', insert: 'turn_right()' },
      { label: 'while hazard_ahead():', insert: 'while hazard_ahead():\n    wait()' },
    ],
  },
  {
    id: 'sandbox',
    number: 13,
    chapter: 'Free Lab',
    title: 'Sandbox Arena',
    concept: 'Open Python Playground',
    objective: 'Experiment freely with Python functions, lists, math, print(), and rover maneuvers.',
    briefing:
      'No mission restrictions here. Test algorithms, print() calculations, or challenge yourself to gather every crystal in your own style.',
    gridWidth: 9,
    gridHeight: 7,
    start: { x: 1, y: 3, dir: 1 },
    goal: { x: 7, y: 3 },
    walls: [
      { x: 4, y: 2 },
      { x: 4, y: 4 },
    ],
    gems: [
      { x: 3, y: 1 },
      { x: 3, y: 5 },
      { x: 6, y: 2 },
      { x: 6, y: 4 },
    ],
    hazards: [],
    maxEnergy: 200,
    parLines: 99,
    isSandbox: true,
    starterCode: `# Free Python Sandbox — experiment with functions, lists, and loops!
def patrol_square(size):
    for side in range(4):
        move(size)
        turn_left()

print("Starting Sandbox Run!")
move(2)
patrol_square(2)
`,
    hints: [
      'Try writing recursive functions, Fibonacci counters with print(), or a wall-following maze solver.',
    ],
    snippets: [
      { label: 'def fn():', insert: 'def fn():\n    ' },
      { label: 'for i in range(4):', insert: 'for i in range(4):\n    ' },
      { label: 'print(...)', insert: 'print()' },
    ],
  },
];
