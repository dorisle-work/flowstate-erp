# Design

## Platform

web

## Scene

A branch desk in daylight. The working surface is white and slate-50. The navigation rail is the dark slate of a closed ledger.

## Tokens

- Canvas `#F5F6F8`, surfaces `#FFFFFF`, text `#1C1F26`. Primary buttons and the selected date chip are that same charcoal. Charts use mint `#3DDC97`, amber `#F6C445`, blue `#5B8CFF`, and coral `#F07167`.
- Borders are a light gray. Muted text stays slate on white surfaces.
- Status chips: draft slate, pending amber, approved blue, dispatched and completed emerald, rejected and cancelled rose. Each chip has a border and a text label.
- Type: Be Vietnam Pro for the whole interface, including codes, dates, quantities, and money. Numbers use tabular figures. Page titles are 22px semibold. Table text stays 13px. Amounts align right.
- Row height 40px. Header height 36px. Radius 8px on controls, 12px on panels.
- Elevation is one soft shadow on the action dock and menus only. Tables use a 1px border and no shadow.

## Components

- App shell: collapsible sidebar, top bar, scrollable main. The home surface is the operational dashboard: branch and date scope, four telemetry cards, a status funnel beside the stock ledger, and the queue of orders waiting for approval or dispatch.
- App shell nav: Tổng quan, Đơn hàng, Tồn kho.
- Compact table: sticky header, code pinned left and actions pinned right from the `lg` breakpoint up. Below that, the table scrolls sideways.
- Stepper: five steps, emerald check for done, indigo pulse for the current step, dashed connector ahead, rose banner when the order is rejected or cancelled.
- Action dock sticks to the bottom of the detail view. Reject and cancel open a reason dialog. The confirm control reads "Đang ghi nhận..." while the request is in flight.

## Motion

One pulse on the current workflow step. It is removed when the user prefers reduced motion.
