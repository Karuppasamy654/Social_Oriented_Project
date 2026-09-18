# CodeBuddy Database Schema & Entity Relationship Specification

## Core Collections & Schemas

### 1. `users`
- `_id`: ObjectId
- `name`: String
- `email`: String (Unique, Indexed)
- `passwordHash`: String
- `avatar`: String
- `level`: String (`Beginner`, `Intermediate`, `Advanced`, `Expert`)
- `skillConfidence`: Number
- `xp`: Number
- `elo`: Number (Default: 1200)
- `streak`: Number
- `targetCompanies`: [String]
- `preferredLanguages`: [String]
- `stats`: Object (solvedCount, totalSubmissions, accuracy, easySolved, medSolved, hardSolved)

### 2. `problems`
- `_id`: ObjectId
- `title`: String
- `slug`: String (Unique, Indexed)
- `description`: String
- `difficulty`: String (`Easy`, `Medium`, `Hard`)
- `category`: String
- `tags`: [String]
- `sampleTestCases`: [{ input, output, explanation }]
- `hiddenTestCases`: [{ input, output }]
- `starterCode`: Object (cpp, javascript, python)

### 3. `submissions`
- `_id`: ObjectId
- `userId`: ObjectId (Indexed)
- `problemId`: ObjectId (Indexed)
- `language`: String
- `code`: String
- `status`: String (`Accepted`, `Wrong Answer`, `Time Limit Exceeded`, `Runtime Error`, `Compilation Error`)
- `runtimeMs`: Number
- `memoryKb`: Number
- `testsPassed`: Number
- `testsTotal`: Number
- `aiReview`: Object (timeComplexity, spaceComplexity, codeQualityScore, suggestions)
- `understandingScore`: Number

### 4. `mistakes`
- `_id`: ObjectId
- `userId`: ObjectId (Indexed)
- `topic`: String
- `mistakeType`: String
- `frequency`: Number
- `lastDetected`: Date
- `resolved`: Boolean

### 5. `user_memories`
- `_id`: ObjectId
- `userId`: ObjectId (Indexed, Unique)
- `strengths`: [String]
- `weakTopics`: [String]
- `recurringMistakes`: [Object]
- `solvedConcepts`: [String]
- `interviewWeaknesses`: [String]

### 6. `interview_sessions`
- `_id`: ObjectId
- `userId`: ObjectId (Indexed)
- `company`: String
- `role`: String
- `difficulty`: String
- `questions`: [Object]
- `evaluationReport`: Object (overallScore, problemSolving, coding, communication, complexity, edgeCases, codeQuality)
- `integrityEvents`: [Object]

### 7. `study_rooms`
- `_id`: ObjectId
- `roomId`: String (Unique, Indexed)
- `name`: String
- `hostId`: ObjectId
- `problemId`: ObjectId
- `members`: [Object]
- `isPrivate`: Boolean

### 8. `competitions`
- `_id`: ObjectId
- `title`: String
- `startTime`: Date
- `endTime`: Date
- `problems`: [ObjectId]
- `participants`: [{ userId, score, finishTime, ratingBefore, ratingAfter }]
- `status`: String (`Upcoming`, `Active`, `Ended`)
