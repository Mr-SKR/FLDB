import ResponsiveAppBar from "../components/headers/Header";
import { Typography } from "@mui/material";

function NearMe() {
  return (
    <>
      <ResponsiveAppBar />
      <header className="App-body">
        <Typography textAlign="center">Coming Soon</Typography>
      </header>
    </>
  );
}
export default NearMe;
