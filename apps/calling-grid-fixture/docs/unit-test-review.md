# gridReducer.test.ts — unit test review

Snapshot taken 2026-10-06. 119 existing tests (all passing, confirmed via a fresh, non-cached
`jest` run) + 4 proposed tests not yet written. Numbered for easy reference when discussing
changes. Edit the **Verdict** column (`Keep` / `Kill` / `Edit` / `Write` / whatever convention
you like) and send it back if you want me to action it.

Not unit-testable at this layer (not listed as numbered rows): absolute pixel centering of a
row as a block (mode 1/3 "kink" fix, mode 2 edge-flush — the reducer only computes sizes, never
positions; centering is outer-flex CSS, verified live via Playwright instead), and the PiP's
19%/4:3 sizing in one-on-one mode (hardcoded in `FluidVideoGrid.tsx`'s render, not reducer
logic).

## Solo call

| #   | Test                                                                                      | Status | Verdict |
| --- | ----------------------------------------------------------------------------------------- | ------ | ------- |
| 1   | a lone active participant gets one full tile filling the container                        | Pass   | Keep    |
| 2   | a lone passive participant still gets a full tile — solo bypasses active/passive entirely | Pass   | Keep    |
| 3   | a lone passive self still gets a full tile                                                | Pass   | Keep    |
| 4   | tile dimensions respect the configured min/max height                                     | Pass   | Keep    |
| 5   | a newcomer joining right after does not evict the solo incumbent from seat 0              | Pass   | Kill    |


### Questions

- do we need test 3, isn't it the same as 2, can we maybe streamline solo active self participant gets one full tile, solo passive participant gets one full tile


## One-on-one call

| #   | Test                                                                                                | Status | Verdict |
| --- | --------------------------------------------------------------------------------------------------- | ------ | ------- |
| 6   | the other participant fills the stage and self becomes the pip, regardless of tier                  | Pass   | Keep    |
| 7   | uses the one-on-one template even when self is the active one and the other is passive              | Pass   | Keep    |
| 8   | falls back to the general grid when neither participant is flagged as self                          | Pass   | Keep    |
| 9   | presenter mode (auto-activated by screen share) takes priority over the one-on-one template         | Pass   | Keep    |
| 120 | *(new)* solo (self alone) → `ADD_PARTICIPANT` a second person transitions live into one-on-one      | TODO   | Keep    |
| 121 | *(new)* 3-person grid (with self) → `REMOVE_PARTICIPANT` down to 2 transitions live into one-on-one | TODO   | Keep    |


### Questions

- does stage also conform to min and max dimensions rules?
- I think we removed the notion of tier, can we just make 6 and 7 into one claim saying thtat self is pip and other fills the stage regardles of their active/passive status
- number 8 shouldn't happen, self should always be present in the call!
- we should add framer animations to put self into and out from pip, and we should also animate passive tiles the same as we animate full tiles (entry animation).

## ADD_PARTICIPANT

| #   | Test                                                                                     | Status | Verdict |
| --- | ---------------------------------------------------------------------------------------- | ------ | ------- |
| 10  | is idempotent — duplicate id is ignored                                                  | Pass   | Keep    |
| 11  | screen-sharing outranks speaking-camera in the slot order                                | Pass   | Keep    |
| 12  | a higher-priority newcomer does not evict an incumbent from their full seat              | Pass   | Keep    |
| 13  | active participants each get their own full tile when there is room to spare             | Pass   | Keep    |
| 14  | passive participants are compressed into the fraction container, never given a full tile | Pass   | Keep    |

### Questions


- simplify the language so it's easier to understand for non native english speakers: a higher-priority newcomer does not evict an incumbent from their full seat.  I would tune this a little. If grid is not full then just keep current participants in their seat and add new participant to the grid. If the grid is full then remove the least recently active participant from the full tile and give it to newcomer. we will probably need to use some ordered list mechanism to do this (preferred), or maybe timestamps, let's discuss. also, while hold time is passing, I noticed that tiles have active speaker blue indicator, they shouldn't have it. only people active speaking have it, and it is independent of debounce and hold time. so we need to save this status in another variable that says whether or not you are considered active and wheter or not you are actively speaking at the moment.

## REMOVE_PARTICIPANT

| #   | Test                                                                                                              | Status | Verdict |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| 15  | removes participant and recalculates layout                                                                       | Pass   | Keep    |
| 16  | removing unknown id is a no-op                                                                                    | Pass   | Keep    |
| 17  | cleans up slot map for removed participant                                                                        | Pass   | Keep    |
| 18  | removing the last passive participant removes the fraction container                                              | Pass   | Keep    |
| 122 | *(new)* removing a full-tile holder promotes the next-highest-priority fraction participant into the vacated seat | TODO   | Keep    |

### Questions

- change fraction to fractional tile everywhere
- I don't understand what this is: removing a full-tile holder promotes the next-highest-priority fraction participant into the vacated seat, this is only true if there are active participants eligible for the full tile. I would say in case of full grid where some active participants are pushed into fractional tiles, once full tile is freed up, active participant is promoted into a ful tile

## computeTileCounts

| #   | Test                                                                                                               | Status | Verdict |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------ | ------- |
| 19  | no participants → no tiles, no container                                                                           | Pass   | Keep    |
| 20  | an active-only call that fits entirely in full tiles needs no container                                            | Pass   | Keep    |
| 21  | any passive participant forces a container to exist, even with room to spare                                       | Pass   | Keep    |
| 22  | an all-passive call gives nobody a full tile                                                                       | Pass   | Keep    |
| 23  | active overflow beyond capacity also forces a container                                                            | Pass   | Keep    |
| 24  | sacrifices exactly one full tile when actives alone would otherwise saturate the grid                              | Pass   | Keep    |
| 25  | sacrifices a full tile when passives are present and actives already saturate the row                              | Pass   | Keep    |
| 26  | does not sacrifice a full tile when the grid has slack left                                                        | Pass   | Keep    |
| 27  | does not change behaviour for a fully-active call that exactly fills the grid                                      | Pass   | Keep    |
| 28  | regression: does not sacrifice a full tile just because actives alone would perfectly fill a smaller shape         | Pass   | Keep    |
| 123 | *(new)* does not sacrifice when `full === maxTiles - 1` (one short of saturating — the tight edge of the boundary) | TODO   | Keep    |

### Questions

- 19 shouldn't really happen, self is always a participant!
- use name fractional tile container instead of just container
- 24 I don't understand, maybe we can say if there is need for fractional tile container, its minimal size is exactly the size of one full tile
- same with 25 it's not precise: it's not important that actives saturate the row, but that they saturate the full grid, this is currently working as expected but this test case might be not needed
- why would 27 and 28 happen at all, is this redundant? I see it as regression, but it might have been due to figuring out the actual spec? same with 123

## Tile dimension invariants

| #   | Test                                                                    | Status | Verdict |
| --- | ----------------------------------------------------------------------- | ------ | ------- |
| 29  | the chosen column count always fits within the usable container width   | Pass   | Keep    |
| 30  | tileAspectRatio stays within [minAR, maxAR]                             | Pass   | Keep    |
| 31  | 6 active participants in 960×540 uses 2 rows, not a single portrait row | Pass   | Keep    |
| 32  | tileHeight stays within configured bounds                               | Pass   | Keep    |

### Questions

- is 31 needed?
- Maybe we can add some concrete layout examples for given viewport and values of min max height and aspect ratio.

## Tier priority

| #   | Test                                                                                                                         | Status | Verdict |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| 33  | a passive self does not outrank participants in the active bucket                                                            | Pass   | Keep    |
| 34  | an active self ranks by tier like anyone else — it does not jump ahead of higher-tier peers                                  | Pass   | Keep    |
| 35  | a passive self is appended after existing peers in the same tier, like any newcomer                                          | Pass   | Keep    |
| 36  | self follows the same ordering rules as everyone else as participants come and go                                            | Pass   | Keep    |
| 37  | self moves from the active bucket to the passive bucket when it goes silent-camera-off                                       | Pass   | Keep    |
| 38  | self earns a full tile only once it becomes active                                                                           | Pass   | Keep    |
| 39  | seat allocation follows tier order: screen-sharing < speaking-camera < speaking-no-camera < silent-camera < silent-no-camera | Pass   | Keep    |
| 40  | higher-priority participants stay visible when many low-priority participants overflow                                       | Pass   | Keep    |


### Questions

- do we still need any of these special cases about self, if we just decided to treat it as everyone else, except in the one to one case and single participant case?
- I would maybe add a situation where we have participants in the overflow tile that then get bumped to lets say silent-camera tier, they should then get a fractional tile unless they already had it, promotional logic is similar to before.

## Full-tile seat stickiness

| #   | Test                                                                            | Status | Verdict |
| --- | ------------------------------------------------------------------------------- | ------ | ------- |
| 41  | self competes for full tiles by the same priority order as everyone else        | Pass   | Keep    |
| 42  | upgrading a participant does not displace the existing full-tile holder         | Pass   | Keep    |
| 43  | tier downgrade immediately loses the full seat — no grace period                | Pass   | Keep    |
| 44  | a newcomer with higher recency does not displace an existing full-tile holder   | Pass   | Keep    |
| 45  | promoting a participant to active leaves the existing full-tile holder seated   | Pass   | Keep    |
| 46  | a fraction participant who turns their camera on is promoted to a full tile     | Pass   | Keep    |
| 47  | turning a camera on does not move anyone when nobody is under capacity pressure | Pass   | Keep    |

### Questions

- no need to treat self differently anywhere, maybe remove these overly specific tests
- can we be more specific in 42, full tile holder is only going to get displaced if grid is saturated and there is no more places to put someone with bigger priority, then we treat participants that were more recently active as more important, but preserving that screensharing is always more important than speaking which is always more important than camera on. they are only sorted relatively to each other based on recency. for example someone who is actively speaking is more important than someone with camera on, and within group of actively speaking the one who spoke most recently is the most important. however, all rules about not jumping around or getting tile reassignments if you already hold a full tile still apply, as well as holding time before getting demoted as non active as well.
- 43 should also be more specific, is this only refering to camera status? so debounce and hold are then only applied to how actively speaking influences the status of an active speaker. I agree with this classification, however blue border should be 'live' and instantly light on/off as actively speaking information is passed. but status as an active speaker conforms to debounce and hold to prevent layout jumping just because people are having a conversation with interchangeable replies.
- 44 is this duplicate of some other tests, I think we discussed, it can be displaced only in case of saturated grid
- 45 be more specific - if there is space and they are still eligible to keep the seat
- 46 again - be more specific if there is space they get the full tile, if there is no space then they push out other participants that only ever had camera on and didn't speak on the basis of recency. so whenever participant switches tier they get inserted at top of the list of that tier, after all other participants with a higher tier, but before all other with the same tier. then they are assigned to tiles and if they are eligible for the same tile as before they don't move, if they are eligible for an upgrade, tiles are swapped.

- can you elaborate 47? it should upgrade the participant from fractional tile to a full tile if there is no capacity pressure

## Recency ordering within active tiers

| #   | Test                                                  | Status | Verdict |
| --- | ----------------------------------------------------- | ------ | ------- |
| 48  | first added active participant gets the first seat    | Pass   | Keep    |
| 49  | passive participants are seated in arrival order      | Pass   | Keep    |
| 50  | updating a non-tier field does not change activatedAt | Pass   | Keep    |

### Questions

- do we need activated at if we just use careful inserting participants in lists at appropriate positions? we can keep it if it is used for active speaker status assignment, but then we should use more specific naming.
- everyone is always seated in seating order and this is the consequence of participants keeping their tile if they are still eligible to the same tile tier 

## activatedAt management

| #   | Test                                                       | Status | Verdict |
| --- | ---------------------------------------------------------- | ------ | ------- |
| 51  | ADD_PARTICIPANT with active tier auto-sets activatedAt     | Pass   | Keep    |
| 52  | ADD_PARTICIPANT with passive tier does not set activatedAt | Pass   | Keep    |
| 53  | UPDATE_PARTICIPANT changing tier refreshes activatedAt     | Pass   | Keep    |
| 54  | UPDATE_PARTICIPANT not changing tier preserves activatedAt | Pass   | Keep    |


### Questions

- see previous comments about activatedAt

## computeFractionalTileSize

| #   | Test                                                                                            | Status | Verdict |
| --- | ----------------------------------------------------------------------------------------------- | ------ | ------- |
| 55  | is independent of participant count — same tileHeight always yields the same rows               | Pass   | Keep    |
| 56  | never returns fewer than 2 rows — a fractional tile is never the size of a full tile            | Pass   | Keep    |
| 57  | rows is however many fixed-height cells land closest to an exact fit of the tile height         | Pass   | Keep    |
| 58  | more available height yields more rows, holding tile width constant                             | Pass   | Keep    |
| 59  | shrinks the fixed target only when even 2 rows do not otherwise fit                             | Pass   | Keep    |
| 60  | width follows a fixed aspect ratio, not the current full tile shape — no tileWidth input at all | Pass   | Keep    |

### Questions

- we need to expand on this. min and max aspect ratios for full tile and fractional tile need to be in sync, we should always be able to subdivide full tile into two rows or two columns to yield two fractional tiles. if aspect ratio bounds don't allow this, exception should be thrown at the time of configuration. we always need to be able to subdivide full tile. however, some configurations such as 3x2 or 3x3 or 4x3, etc. might not be possible and this is ok, these layouts are checked before deciding to open an overflow tile.
- same checks need to be performed at config time to determine if min height and min/max aspect ratio requirements for fractional tile also alow for at least 2 cols or 2 rows subdivision. simple calculation should be performed only to check the extremes, then all intermediate cases will automatically be covered. if unclear, let's discuss.

## Fractional tile container (modes 1/2/3)

| #   | Test                                                                                                           | Status | Verdict |
| --- | -------------------------------------------------------------------------------------------------------------- | ------ | ------- |
| 61  | a fractional tile is never a 1×1 shape — always at least a 2-way split                                         | Pass   | Keep    |
| 62  | adding a 4th passive keeps filling the column instead of jumping to a 2×2 shape                                | Pass   | Keep    |
| 63  | fills column-major — the array order is priority order; CSS places it column-major                             | Pass   | Keep    |
| 64  | fractional tile dimensions are null when no container exists                                                   | Pass   | Keep    |
| 65  | active overflow spills into the container too, alongside the passives                                          | Pass   | Keep    |
| 66  | mode 1: tags fillDirection "column" and align "center" when sharing the only row                               | Pass   | Keep    |
| 67  | mode 1: width hugs narrower than the full tile — not snapped — when under capacity                             | Pass   | Keep    |
| 68  | mode 1: width snaps to exactly the full tile width once truly at overflow capacity                             | Pass   | Keep    |
| 69  | mode 1: width/alignment is identical exactly at capacity and just past it — overflow must not shift the layout | Pass   | Keep    |
| 70  | mode 1: the box height always matches the full tile, but the cell itself stays small either way                | Pass   | Keep    |
| 71  | mode 1: the cell size is invariant — identical whether the column is under-filled or completely full           | Pass   | Keep    |
| 72  | mode 3: tags fillDirection "column" and align "start" when full-tile rows exist above it                       | Pass   | Keep    |
| 73  | mode 3: hugs its content below max columns — width constant within a column count, grows only on new column    | Pass   | Keep    |
| 74  | mode 3: flushes exactly to the available width once at max columns — no "kink" against full-tile row(s)        | Pass   | Keep    |
| 75  | mode 2: tags fillDirection "row" and align "center" when it has a row to itself                                | Pass   | Keep    |
| 76  | mode 2: fills row-major — a handful of participants sit in one row, not stacked in a column                    | Pass   | Keep    |
| 77  | mode 2: always hugs — never stretches to tileHeight even with plenty of content                                | Pass   | Keep    |
| 78  | mode 2: a fully-packed row tiles edge-to-edge with zero slack, not a symmetric inset                           | Pass   | Keep    |


### Questions

- 62, 63 probably irrelevant, 65 is worded very vaguely
- describe modes: full tiles present to the left and above, full tiles present only to the left, full tiles present only above/not present at all

## Overflow

| #   | Test                                                                                     | Status | Verdict |
| --- | ---------------------------------------------------------------------------------------- | ------ | ------- |
| 79  | no overflow badge when everyone fits                                                     | Pass   | Keep    |
| 80  | overflow badge appears once the container runs out of row space                          | Pass   | Keep    |
| 81  | caps capacity to the width left over next to a full tile sharing its row — regression    | Pass   | Keep    |
| 82  | overflow count equals the number of participants that did not fit                        | Pass   | Keep    |
| 83  | adding one more participant increases the overflow count by one once already overflowing | Pass   | Keep    |
| 84  | overflow badge carries up to 3 avatars                                                   | Pass   | Keep    |
| 85  | the overflow badge is the last slot in the container                                     | Pass   | Keep    |

### Questions

- 81 is very confusingly worded, do we need it?

## Presenter mode

| #   | Test                                                                                                               | Status | Verdict |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------ | ------- |
| 86  | auto-activates when a screen share appears                                                                         | Pass   | Keep    |
| 87  | does not auto-activate without a screen share                                                                      | Pass   | Keep    |
| 88  | auto-activates when an existing participant starts sharing                                                         | Pass   | Keep    |
| 89  | toggling off with exactly 2 participants reveals the one-on-one template underneath                                | Pass   | Keep    |
| 90  | toggling off with 3+ participants reveals the tiled grid                                                           | Pass   | Keep    |
| 91  | spotlights the highest-priority tier — screen-sharing beats speaking beats everything else                         | Pass   | Keep    |
| 92  | self takes the spotlight when self genuinely is the highest-priority participant — no seating privilege either way | Pass   | Keep    |
| 93  | with multiple screen-sharers, the most recently started one gets the spotlight ("stack" behavior)                  | Pass   | Keep    |
| 94  | falls back to the most recently active speaker once nobody is screen-sharing                                       | Pass   | Keep    |
| 95  | falls back to the most recently active camera-on participant once nobody is sharing or speaking                    | Pass   | Keep    |
| 96  | puts everyone except the spotlight into the strip                                                                  | Pass   | Keep    |
| 97  | sizes strip tiles within the aspect-ratio bounds                                                                   | Pass   | Keep    |
| 98  | adds an overflow tile to the strip when it cannot hold everyone                                                    | Pass   | Keep    |
| 99  | reverts to off once the only screen share ends, if presenter mode was off beforehand                               | Pass   | Keep    |
| 100 | stays on after the screen share ends, if presenter mode was manually on beforehand                                 | Pass   | Keep    |
| 101 | a manual toggle during the screen share takes effect immediately but is discarded once sharing ends                | Pass   | Keep    |
| 102 | does not re-snapshot the remembered setting when a second screen share starts during an existing one               | Pass   | Keep    |

### Questions

- 87 might be redundant
- 92 also might be redundant if we remove all remnants of self prioritization, self is the same as everyone else for layout purposes
- add falls back to the most recently joined participant if nobody is sharing or speaking or have camera on
- spotlight always gets one highest priority participant, but the strip behaves exactly as a grid - if participants get higher priority but would have the same tier tile granted, they keep the existing seat

## areAllParticipantsShown

| #   | Test                          | Status | Verdict |
| --- | ----------------------------- | ------ | ------- |
| 103 | defaults to false and toggles | Pass   | Keep    |
| 104 | does not disturb the layout   | Pass   | Keep    |

## SET_CONTAINER_SIZE

| #   | Test                                                       | Status | Verdict |
| --- | ---------------------------------------------------------- | ------ | ------- |
| 105 | recalculates layout without touching participants or slots | Pass   | Keep    |
| 106 | tileHeight stays within bounds after a resize              | Pass   | Keep    |
| 107 | a very small container still produces a valid layout       | Pass   | Keep    |
| 108 | a wider container yields more maxCols                      | Pass   | Keep    |

### Questions

- we need to find a way to put min height and width on the container to be at least 2 min heights high and one min width wide or at least two min widths wide and one min height high
- we need to find a way to continuously drag and drop resize the container in the grid view fixture, existing modes are not sufficient for testing, we can just make it fill the container and leverage browser screen changing

## _computeLayout (internal)

| #   | Test                                                                 | Status | Verdict |
| --- | -------------------------------------------------------------------- | ------ | ------- |
| 109 | empty participant list returns no tiles                              | Pass   | Keep    |
| 110 | single participant produces one full tile                            | Pass   | Keep    |
| 111 | tile count never exceeds maxRows × maxCols                           | Pass   | Keep    |
| 112 | a zero-sized container produces an empty layout rather than throwing | Pass   | Keep    |

- what does 111 tile count mean, is it full tiles? be more precise

## _updateSlotMap (internal)

| #   | Test                                                                                | Status | Verdict |
| --- | ----------------------------------------------------------------------------------- | ------ | ------- |
| 113 | assigns initial slots in tier priority order                                        | Pass   | Keep    |
| 114 | a passive self does not outrank the active bucket                                   | Pass   | Keep    |
| 115 | self ranks by tier like any other participant — a higher-tier peer still goes first | Pass   | Keep    |
| 116 | new passive participant is appended after existing peers in the same tier           | Pass   | Keep    |
| 117 | active tier: higher activatedAt wins the lower slot on initial assignment           | Pass   | Keep    |
| 118 | existing slots are preserved even when recency would reorder them                   | Pass   | Keep    |
| 119 | a newcomer of a higher tier is inserted ahead of lower-tier incumbents              | Pass   | Keep    |

- also 114 may be redundant after cleanup

## Totals

119 existing (119 Pass) + 4 proposed (4 TODO) = 123 unique test cases.
