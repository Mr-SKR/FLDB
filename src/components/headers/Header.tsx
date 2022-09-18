import React, { useState, Fragment } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import NearMeIcon from "@mui/icons-material/NearMe";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Button from "@mui/material/Button";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { Link } from "react-router-dom";

function ResponsiveDrawer(): JSX.Element {
  // const { window } = props;
  const drawerWidth = 240;
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <Divider />
      <List>
        {[
          { text: "Home", route: "/", icon: <HomeIcon /> },
          { text: "Nearby", route: "/nearby", icon: <NearMeIcon /> },
          { text: "About", route: "/about", icon: <InfoIcon /> },
        ].map((page) => {
          return (
            <Fragment key={page.text}>
              <ListItem key={page.text} component={Link} to={page.route}>
                <ListItemIcon>{page.icon}</ListItemIcon>
                <ListItemText
                  primary={page.text}
                  primaryTypographyProps={{
                    color: "black",
                    fontWeight: "bold",
                  }}
                />
              </ListItem>
              <Divider />
            </Fragment>
          );
        })}
      </List>
    </div>
  );

  // const container =
  //   window !== undefined ? () => window().document.body : undefined;

  return (
    <React.Fragment>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Button
            component={Link}
            to={"/"}
            sx={{
              color: "white",
              textDecoration: "none",
              textTransform: "none",
            }}
          >
            <Typography variant="h6" noWrap>
              FLDb
            </Typography>
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          display: "flex",
          width: { sm: `${drawerWidth}px` },
          flexShrink: { sm: 0 },
        }}
      >
        <Drawer
          // container={container}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: `${drawerWidth}px`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </React.Fragment>
  );
}

export default ResponsiveDrawer;
