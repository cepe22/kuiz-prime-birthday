# Security Specification - KuisKu Kahoot Clone

## 1. Data Invariants
- A `QuizRoom` must have a valid 6-digit PIN.
- Only the `hostId` can update the room status, current question, or start the game.
- A `Player` can only join a room that exists and is in the 'lobby' status.
- A `Player` can only update their own scores and answers.
- Scores must be non-negative.
- Answers must be submitted during the 'question' phase.
- Once a room is in 'podium' status, no more answers can be submitted.

## 2. The Dirty Dozen Payloads
1. **Host-Spoofing Status Update**: A player attempts to set room status to 'podium' to end the game early.
2. **Answer-Injecting After Phase**: A player tries to update their answer after the status has changed to 'leaderboard'.
3. **Score-Padding Update**: A player attempts to increment their score by 1,000,000 in a single update.
4. **Room PIN Poisoning**: A client attempts to create a room with a 1MB string as the PIN to cause resource exhaustion.
5. **Unauthorized Question Skillet**: A player attempts to change `currentQ` to skip a difficult question.
6. **Ghost Player Injection**: A user tries to create a player document for another user's UID.
7. **Identity Spoofing**: A player tries to change their name to the host's name or another player's name mid-game.
8. **Shadow Field injection**: A player adds `isAdmin: true` to their participant document.
9. **Relational Sync Bypass**: A player tries to join a non-existent room.
10. **Time-based cheating**: A player submits an answer with a manually crafted `startedAt` to get higher points. (We use server side validation for time where possible, or just trust server status).
11. **Massive Quiz Payload**: A user tries to create a quiz with 10,000 questions (size check needed).
12. **Double Answering**: A player tries to submit multiple answers for the same question.

## 3. Test Runner (Mock)
A true `firestore.rules.test.ts` would involve `@firebase/rules-unit-testing`. I will implement the rules to block these payloads.
