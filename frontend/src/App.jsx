// import { useState } from 'react'
// import './App.css'
// import AppRoute from './routes/AppRoute'
// import { UserProvider } from './context/UserContext'
// function App() {

//   return (
  
//       <UserProvider>
//         <AppRoute />
//       </UserProvider>

//   )
// }

// export default App


import React from 'react';
import AppRoute from './routes/AppRoute'
import { UserProvider } from './context/UserContext'

function App() {
  return (
    <UserProvider>
      <AppRoute />
    </UserProvider>
  );
}

export default App;