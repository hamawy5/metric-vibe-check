# Home, study navigation, and bottom navigation fixes

## Scope
1. **Subscription status on Home**
   - Load the existing access state on Home.
   - Replace the plans banner for active subscribers with “Subscribed — active until [date]”.
   - Add an active badge to the profile icon.
   - Keep a clear link to the plans page so subscribers can extend or move to the longer plan.

2. **Back-button hierarchy**
   - Add native device-back handling for the Study hierarchy: Reading → Units → Subjects → Grades → Home → close app.
   - Use explicit parent destinations rather than browser-history guesses, so deep links and repeated visits behave consistently.
   - Preserve normal web browser back behavior outside the native app.

3. **Floating Back to Units control**
   - Keep the reading page’s Back to Units action visible at the top while its content scrolls.

4. **Reset reading scroll position**
   - Reset the app’s actual scroll container to the top whenever Previous or Next opens another sub-unit.

5. **Summary top spacing**
   - Apply status-bar-safe top spacing to the summary panel header and keep its content independently scrollable.

6. **Hide bottom tabs after grade selection**
   - Show the bottom navigation on Home, the initial grade picker, Exam, and AI only.
   - Hide it on subject, unit, reading, and quiz screens.

7. **Floating bottom navigation redesign**
   - Restyle the four-tab dock with screen-edge gaps, rounded corners, translucent blur, and a subtle shadow.
   - Preserve safe-area spacing and the existing active-tab treatment.

8. **Swipe between main tabs**
   - Add deliberate horizontal-swipe navigation between Home, Study, Exam, and AI in that order.
   - Restrict this gesture to the four top-level tab screens so reading, quiz, horizontal tables, and AI message interactions are unaffected.

## Verification
- Check Home in subscribed and non-subscribed states.
- Exercise every Study back step and Previous/Next scroll reset.
- Verify summary safe-area spacing and bottom-nav visibility by route.
- Test tab taps and left/right swipes at the current phone viewport.
- Confirm the app builds without errors.
