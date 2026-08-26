package com.TestSpringBoot.cbs.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API, non-asset requests to the React SPA index.html
 * so React Router can handle client-side routing.
 */
@Controller
public class SpaFallbackController {

    @RequestMapping(value = {
        "/",
        "/login",
        "/signup",
        "/book",
        "/history",
        "/profile",
        "/support"
    })
    public String forwardToIndex(HttpServletRequest request) {
        return "forward:/index.html";
    }
}
