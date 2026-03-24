# Recent Commands and Changes for App.js and sheetsService.js

## App.js
- Added state variables: `posts`, `courses`, `loading` to `StratovueApp`.
- Added a `useEffect` to fetch posts and courses using `fetchPosts` and `fetchCourses` from `sheetsService.js`, updating state and loading.
- Passed `posts` and `loading` as props to `ThinkingPage`: `{page === 'Thinking' && <ThinkingPage posts={posts} loading={loading}/>} `
- Updated `ThinkingPage` to accept `posts` and `loading` as props (removed local posts array).
- Passed `courses` as a prop to `ClearviewPlatform`: `<ClearviewPlatform courses={courses} setPage={setPage} setPlatform={setPlatform}/>`

## sheetsService.js
- Used for `fetchPosts` and `fetchCourses` functions, which are called in the `useEffect` in `App.js` to load data into state.

---
This file summarizes all recent code and prop changes for quick reference.
