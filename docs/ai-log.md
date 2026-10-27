# AI log

Every time you give an AI tool a significant prompt, add an entry. Three lines each.
"Nothing was wrong" is allowed, but it is rarely true. Your instructor will read this.

## Build 2

### Prompt 1: Build 2 requirements audit and targeted fixes
- **What I asked:** Compare the existing Build 2 implementation and tests with the documented S02, S03, S04, S05 and S06 criteria; verify `npm test`, review the acceptance-criteria gap for S04, and make only necessary Build 2 fixes.
- **What came back:** The initial suite passed 43 tests. The review confirmed the search and merge-sort features already existed, and found that unpublishing was absent, date validation accepted an impossible calendar date, date sorting did not keep same-day events in title order, and tests missed several documented cases. Targeted fixes and tests were added; the final suite passed 48 tests.
- **What was wrong (or "nothing"):** S04 had no implementation or test for unpublishing, and several other tests did not prove the documented acceptance behavior. The three instructor/class-authored S04 acceptance criteria remain blank; no criteria were invented. The new unpublish behavior follows the story by returning an event to draft and hiding it from public summaries.

### Prompt 2: Complete Build 2 S04 criteria and tests
- **What I asked:** Add the three acceptance criteria supplied by the student to `docs/build-2.md`, test each criterion, and verify unpublishing preserves existing bookings without cancellation or refunds.
- **What came back:** The supplied criteria were added verbatim, and inventory tests were made explicit for successful publishing, rejected publishing without tiers, and unpublishing an event with a pending booking while keeping the booking unchanged.
- **What was wrong (or "nothing"):** The earlier audit correctly recorded that the criteria were still missing at that time. The student has now supplied them; the S04 documentation and tests cover all three criteria.

## Build 3

### Prompt 1: Build 3 prompt (docs/build-3.md)
- **What I asked:** Add the architecture diagrams, booking state machine, Node HTTP router/server, configuration, startup script, and tests.
- **What came back:** A layered architecture document, explicit booking transitions, static-file HTTP server, `/health` route, startup configuration, and `node:test` coverage.
- **What was wrong (or "nothing"):** The first server draft relied on an implicit response/request property for HEAD handling and had redundant error-status logic; both were simplified. Added a regression test proving static requests cannot escape `public/`.
