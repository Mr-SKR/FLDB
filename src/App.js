import { Routes, Route } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import About from "./pages/About";
import NearBy from "./pages/NearBy";
import FLDB from "./pages/FLDB";
import Interactive from "./pages/Interactive";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="nearby" element={<NearBy />} />
      <Route path="interactive" element={<Interactive />} />
      <Route path="fldb/:videoId" element={<FLDB />} />
    </Routes>
  );
}

export default App;
