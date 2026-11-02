# Teachable Machine robot direction examples

These editable MakeCode JavaScript examples receive a class name followed by a newline from the Boundary X Teachable Machine web app.

| Class name | Action |
| --- | --- |
| `forward` | Forward |
| `backward` | Backward |
| `left` | Turn left in place |
| `right` | Turn right in place |
| `stop` | Stop |

Use these exact lowercase class names in your own Teachable Machine image model. Existing sample models may use different names; align their labels with the receiver's conditions before use. Unknown strings also stop the motors. Starting the board, connecting, and disconnecting Bluetooth stop the motors. While connected, the last action persists until another command arrives; these beginner examples do not include a receive timeout.

## MakeCode setup

1. Create a micro:bit project in MakeCode.
2. Add the **bluetooth** extension. Remove **radio** if prompted about incompatibility.
3. For Bitrun, add **servos**. For Ponybot, add `https://github.com/boundary-x/ai_ponybot_basic`.
4. Open JavaScript and replace the starter program with the entire corresponding `.ts` file. Do not paste both examples into one project.
5. Set Bluetooth pairing to **No Pairing Required**, following the web app's normal connection setup.
6. Download to the board. Use the name-check project first if you need to identify its Bluetooth name.
7. Load your trained model in the web app, check its transmitted class names, and connect the board.

## Wiring and directions

- Bitrun: left wheel P1, right wheel P2. Forward = P1 +50 / P2 -50, backward = -50 / +50, left = -50 / -50, right = +50 / +50. This follows the supplied Bitrun example.
- Ponybot: right front Motor1, right rear Motor2, left rear Motor3, left front Motor4. The extension's `runNormal(Clockwise)` drives the right side forward and left side backward, so the left-turn function uses that enum. `CounterClockwise` does the reverse. Mapping is based on the implementation, not the English enum names.
- Speeds are starting values, not equivalent physical speeds: Bitrun servo speed is -100 to 100; Ponybot motor speed is 0 to 255.

## Validation

The receive handlers and direction mappings are checked with mocked board APIs. Physical robot motion, MakeCode compilation, and conversion back to blocks still require verification. No published MakeCode share links or compiled HEX files are included yet. The extension source is read-only; this work does not modify it.

## Speed-control examples

Use `bitrun-speed.ts` or `ponybot-speed.ts` in a separate MakeCode project from the direction example. Train an image model with the exact lowercase labels below. The speed examples always drive forward; they do not preserve a previous turning or backward command.

| Class | Bitrun left P1 / right P2 | Ponybot forward motor setting |
| --- | --- | --- |
| `slow` | +25 / -25 | 50 |
| `normal` | +50 / -50 | 100 |
| `fast` | +75 / -75 | 150 |
| `stop` | Both stopped | All stopped |

The values are editable starting settings, not calibrated physical speeds. Bitrun uses servo settings from -100 to 100; Ponybot uses motor settings from 0 to 255. Unknown labels also stop the robot. Initialization and Bluetooth connection/disconnection stop the robot. As in the direction examples, the last command persists until another command or disconnection; no receive timeout is included.

Mocked receiver tests cover increasing/decreasing speed, startup, stop, unexpected labels, and Bluetooth lifecycle. Physical motion and MakeCode compilation/block conversion are not yet verified.
