import { Routes, Route } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import About from "./pages/About";
import NearBy from "./pages/NearBy";
import FLDB from "./pages/FLDB";

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="nearby" element={<NearBy />} />
      <Route path="fldb/:videoId" element={<FLDB />} />
    </Routes>
  );
}

export default App;
