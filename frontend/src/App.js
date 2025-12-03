import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Search from './pages/Search'
import Notifications from './pages/Notifications'
import Chats from './pages/Chats'
import Groups from './pages/Groups'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import UserProfile from './pages/UserProfile'
import CreatePostPage from './pages/CreatePostPage'
import { AuthProvider } from './components/AuthContext'

// import LeftPanel from './components/LeftPanel';
// import Stories from './components/Stories';
// import RightPanel from './components/RightPanel';
// import HomeFeed from './components/HomeFeed';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<Home/>} />
          <Route path="/home" element={<Home/>} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/search" element={<Search/>} />
          <Route path="/notifications" element={<Notifications/>} />
          <Route path="/chats" element={<Chats/>} />
          <Route path="/groups" element={<Groups/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/profile/:username" element={<UserProfile/>} />
          <Route path="/signup" element={<SignUp/>} />
          <Route path="/login" element={<Login/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App


// function App() {

//   // const logoImg = './images/logo.png'
//   return (
//     <>
//     <LeftPanel/>
//     <Stories/>
//     <HomeFeed/>
//     <RightPanel/>
//     {/* <Stories/>
//     <RightPanel/>
//     <HomeFeed/> */}
//     </>
//   );
// }

// export default App;
