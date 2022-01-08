import { Routes, Route } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/system";
import "./App.css";

import Home from "./pages/Home";
import About from "./pages/About";
import NearMe from "./pages/NearMe";
import FLDB from "./pages/FLDB";
import customTheme from "./components/ui/Theme";

function App() {
  return (
    <>
      <CssBaseline />
      <ThemeProvider theme={customTheme}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="nearme" element={<NearMe />} />
          <Route path="fldb/:videoId" element={<FLDB />} />
        </Routes>
      </ThemeProvider>
    </>
  );
}

export default App;
