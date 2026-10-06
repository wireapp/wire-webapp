The overarching goal is to develop a new video call grid that enables us to achieve several goals:
- Actively participating users and users with cameras turned on get more space on the screen
- it is possible to see who is in the call at glance, without having to navigate through pages of icons
- when users share screen screenshare takes up most of the screen, while videos of other participants are also visible.


To achieve this we came up with an idea of fluid video grid and an idea of a fractional tile. Fluid means that the grid automatically adapts to the situation, while avoiding jumpiness and big layout changes.


At any point in time users are sorted in two categories: active and passive. Active users have their camera on and/or have been actively speaking within the designated time period in the past, let's they have been speaking within the last 1 minute, this parameter is called hold time.

When users start speaking they don't immediately gain active status, there is debounce. Let's start with debounce value of 2 seconds.

Now let's see how the system behaves in different scenarios.

1. There is only one person in the call - there is only one big tile containing the self user.

2. There are 2 persons in the call - we use one2one call template where self is in the small thumbnail overlaying the one big tile that is showing the other participant.

3. For 3 and more persons things start getting interesting based on their level of participation. Full tiles are a normal full tile in a grid. FractionalTile is one part of the full tile. Active participants tend to get full tiles, passive participants MUST get fractional tiles. If there is not enough full tiles for active participants to fit in, active participants take up full tiles first, then fractional tiles.

4. Maximum number of rows and max number of columns are determined entierly by the viewport and by the constraints: min and max height and min and max aspect ratio.

5. Dimensions of a fractional tile are determined from the size of a full tile as well as analogous constraints for min and max height of fractional tile as well as min and max aspect ratio of fractional tile. Calculation ensures that within one full tile we can fit exactly a certain number of fractional tiles in a subgrid that's perfectly aligned, taking into account gutter size. Max number of rows and columns are calculated for fractional tiles. Fractional tile can not be the size of a full tile, it has to be the minimum 1/2 of it. If it is impossible to satisfy the constraints with this let me know.

5. However, these fractional tiles are not filled inside of full tile, they are are filled in a special tile that's called fractional tile container. This container always spans exactly one row and this is the last row in the grid, it can span less than one column in width, multiple columns, it can also fill out the whole last row if there is no enough active participants. The width of fractional tile container depends entirely on number of tiles inside of it, it always hugs the contents.

6. If a call contains at least one passive participant we have to have fractional tile container.

7. If a call has many active participants they take up most of the full tiles, but the last tile becomes fractional tile container which is filled with the rest of active participants, and then the passive ones.

8. Tiles inside of the main grid use flex wrap with justify content center so that the last row is always centered. Last row can contain only full tiles, combination of full tiles and fractional tile container or only fractional tile container. they should always be centered and hug the contents.

9. Inside of the fractional tile container there is another flex wrap layout following the same rules as the main grid in case fractional tile container is alone in the last row. If it shares last row with other full tiles, then contents are left aligned, but the full row is always centered.

10. full tiles flow from left to right from top to bottom, after all full tiles comes fractional tile container. Inside of the fractional tile container fractional tiles also flow from left to right, from top to bottom, but they first try to fill out the first column, so it goes first top to bottom, then left to right. This ensures that the last row always has the minimal width.

11. Tiles never grow to fill out the row, all tiles are always the same dimensions and all fractional tiles are also all the same dimensions.

12. Every time viewport changes we calculate the size of tiles and fractional tiles, this is layout invariant.

13. As participants join or change from active to passive and from passive to active, number of full and fractional tiles change, and the layout changes with that.

14. If there is more participants that can fill in all full tiles as well as fractional tiles (minimum size of fractional tiles container is exactly the size of one full tile), then last fractional tile in a fractional container has to be a special overflow tile. Overflow tile shows minimum 2, and maximum 3 avatars stacked and text + X more, where X is number of participants that couldn't fit in the grid and that ended up represented in the overflow tile.