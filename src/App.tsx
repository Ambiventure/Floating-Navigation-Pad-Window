import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Terminal, Copy, Check, ExternalLink, Maximize2, Plus, Play, Pause, VolumeX, Minus } from 'lucide-react';

const PYTHON_CODE = `import tkinter as tk
from tkinter import simpledialog
import pyautogui
pyautogui.PAUSE = 0.0
import time
import os
import ctypes
import sys
import json
import math

# Configuration
if getattr(sys, 'frozen', False):
    # If running as EXE (PyInstaller)
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # If running as script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(BASE_DIR, "navpad_config.json")

IS_WINDOWS = sys.platform == "win32"
KEY_MAP = {
    "up": (0x26, 0x48, True),
    "down": (0x28, 0x50, True),
    "left": (0x25, 0x4B, True),
    "right": (0x27, 0x4D, True),
    "space": (0x20, 0x39, False),
    "esc": (0x1B, 0x01, False),
    "enter": (0x0D, 0x1C, False),
    "printscreen": (0x2C, 0x37, True),
    "volumeup": (0xAF, 0x30, True),
    "volumedown": (0xAE, 0x2E, True),
    "volumemute": (0xAD, 0x20, True),
    "f11": (0x7A, 0x57, False),
    "win": (0x5B, 0x5B, True),
    "ctrl": (0x11, 0x1D, False),
    "shift": (0x10, 0x2A, False),
    "alt": (0x12, 0x38, False),
    "tab": (0x09, 0x0F, False),
    "backspace": (0x08, 0x0E, False),
    "delete": (0x2E, 0x53, True),
    "playpause": (0xB3, 0x22, True),
    "nexttrack": (0xB0, 0x19, True),
    "prevtrack": (0xB1, 0x10, True)
}

def resolve_key(key_str):
    k = key_str.lower().strip()
    # Normalize synonyms
    if k in ["control", "ctl"]: k = "ctrl"
    if k in ["escape"]: k = "esc"
    if k in ["prt", "prt sc", "prtsc"]: k = "printscreen"
    if k in ["spc"]: k = "space"
    if k in ["del"]: k = "delete"
    if k in ["back"]: k = "backspace"
    
    if k in KEY_MAP:
        return KEY_MAP[k]
    # Check for F-keys
    if k.startswith("f") and len(k) > 1:
        try:
            num = int(k[1:])
            if 1 <= num <= 12:
                vk = 0x6F + num # F1 is 0x70, F12 is 0x7B
                return (vk, 0, False)
        except:
            pass
    if len(k) == 1:
        char = k[0]
        if "a" <= char <= "z":
            vk = 0x41 + (ord(char) - ord("a"))
            return (vk, 0, False)
        if "0" <= char <= "9":
            vk = 0x30 + (ord(char) - ord("0"))
            return (vk, 0, False)
    return None

def win_key_down(key_str):
    if IS_WINDOWS:
        res = resolve_key(key_str)
        if res:
            vk, scan, extended = res
            if scan == 0:
                try:
                    scan = ctypes.windll.user32.MapVirtualKeyW(vk, 0)
                except:
                    pass
            flags = 0x0001 if extended else 0 # KEYEVENTF_EXTENDEDKEY
            try:
                ctypes.windll.user32.keybd_event(vk, scan, flags, 0)
                return
            except:
                pass
    try:
        pyautogui.keyDown(key_str)
    except:
        pass

def win_key_up(key_str):
    if IS_WINDOWS:
        res = resolve_key(key_str)
        if res:
            vk, scan, extended = res
            if scan == 0:
                try:
                    scan = ctypes.windll.user32.MapVirtualKeyW(vk, 0)
                except:
                    pass
            flags = 0x0002 # KEYEVENTF_KEYUP
            if extended:
                flags |= 0x0001 # KEYEVENTF_EXTENDEDKEY
            try:
                ctypes.windll.user32.keybd_event(vk, scan, flags, 0)
                return
            except:
                pass
    try:
        pyautogui.keyUp(key_str)
    except:
        pass

def get_rounded_rect_points(x1, y1, x2, y2, r, steps=12):
    r = min(r, (x2 - x1) // 2, (y2 - y1) // 2)
    if r <= 0:
        return [x1, y1, x2, y1, x2, y2, x1, y2]
    
    points = []
    
    # Top-Right
    cx, cy = x2 - r, y1 + r
    for i in range(steps + 1):
        angle = -math.pi/2 + (math.pi/2) * (i / steps)
        points.append(cx + r * math.cos(angle))
        points.append(cy + r * math.sin(angle))
        
    # Bottom-Right
    cx, cy = x2 - r, y2 - r
    for i in range(steps + 1):
        angle = (math.pi/2) * (i / steps)
        points.append(cx + r * math.cos(angle))
        points.append(cy + r * math.sin(angle))
        
    # Bottom-Left
    cx, cy = x1 + r, y2 - r
    for i in range(steps + 1):
        angle = math.pi/2 + (math.pi/2) * (i / steps)
        points.append(cx + r * math.cos(angle))
        points.append(cy + r * math.sin(angle))
        
    # Top-Left
    cx, cy = x1 + r, y1 + r
    for i in range(steps + 1):
        angle = math.pi + (math.pi/2) * (i / steps)
        points.append(cx + r * math.cos(angle))
        points.append(cy + r * math.sin(angle))
        
    return points

def draw_smooth_rounded_rect(canvas, x1, y1, x2, y2, r, fill="", outline="", width=1):
    points = get_rounded_rect_points(x1, y1, x2, y2, r, steps=16)
    # create_polygon handles both transparent fill ("") and clean borders with no overlaps or glitches
    return [canvas.create_polygon(points, fill=fill, outline=outline, width=width)]

class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, command=None, press_cmd=None, release_cmd=None, zoom=1.0, fg="white", bg="#1a1a1a", border_color="#333", radius=None, is_circle=False, btn_id=None, app=None):
        self.zoom = zoom
        self.base_size = 64
        self.size = int(self.base_size * zoom)
        self.app = app
        self.btn_id = btn_id
        
        # Determine background behind the canvas to avoid artifacts
        if app and not is_circle:
            if not app.is_expanded:
                bg_outside = app.theme.get("min_bg", app.theme.get("dot_bg", "#1a1a1a"))
            else:
                bg_outside = app.theme.get("pad_bg", "#121212")
        else:
            bg_outside = "#000001"
        
        super().__init__(parent, width=self.size, height=self.size, bg=bg_outside, highlightthickness=0, bd=0, takefocus=0)
        
        self.command = command
        self.press_cmd = press_cmd
        self.release_cmd = release_cmd
        self.fg = fg
        self.bg = bg
        self.border_color = border_color
        self.radius_override = radius
        self.is_circle = is_circle
        self.text = text
        
        self.bind("<Button-1>", self.on_press)
        self.bind("<ButtonRelease-1>", self.on_release)
        self.bind("<Button-3>", self.on_right_click)
            
        # Dragging support for layout editing
        self.bind("<B1-Motion>", self.on_drag)
        self.drag_start_x = 0
        self.drag_start_y = 0
            
        self.draw()

    def on_right_click(self, event):
        if self.app and self.btn_id and (self.btn_id.startswith("c") or self.btn_id in self.app.mappings):
            self.app.show_shortcut_menu(self.btn_id, event)

    def draw(self, pressed=False):
        self.delete("all")
        w, h = self.size, self.size
        padding = 4
        # Use theme active color if available
        if self.bg == "transparent":
            rect_bg = self.app.theme.get("btn_active_bg", "#444") if pressed else ""
        else:
            rect_bg = self.app.theme.get("btn_active_bg", "#444") if (pressed and self.app) else ("#444" if pressed else self.bg)
        
        # Determine radius
        if self.is_circle:
            radius = w//2
        elif self.radius_override is not None:
            # Allow up to full circle if radius is high
            radius = min(w//2, int(self.radius_override * self.zoom))
        else:
            radius = int(24 * self.zoom) # Fallback
            
        # Draw body with smooth rounded corners
        self.create_rounded_rect(padding, padding, w-padding, h-padding, radius, fill=rect_bg, outline=self.border_color, width=1)
        
        # Draw Icon or Text
        self.draw_content(pressed)

    def draw_content(self, pressed):
        w, h = self.size, self.size
        m = int(self.size * 0.32) # dynamic margin
        color = self.fg
        
        if self.text == "▲":
            self.create_polygon(w//2, m, m, h-m, w-m, h-m, fill=color, outline=color, width=1)
        elif self.text == "▼":
            self.create_polygon(w//2, h-m, m, m, w-m, m, fill=color, outline=color, width=1)
        elif self.text == "◀":
            self.create_polygon(m, h//2, w-m, m, w-m, h-m, fill=color, outline=color, width=1)
        elif self.text == "▶":
            self.create_polygon(w-m, h//2, m, m, m, h-m, fill=color, outline=color, width=1)
        elif self.text == "⏵⏸":
            is_playing = getattr(self.app, "is_playing", False)
            if is_playing:
                # Pause: Parallel lines
                w1_start = int(w * 0.35)
                w1_end = int(w * 0.45)
                w2_start = int(w * 0.55)
                w2_end = int(w * 0.65)
                self.create_rectangle(w1_start, m, w1_end, h-m, fill=color, outline="")
                self.create_rectangle(w2_start, m, w2_end, h-m, fill=color, outline="")
            else:
                # Play: Right-pointing triangle
                x_left = m + int(2 * self.zoom)
                x_right = w - m + int(2 * self.zoom)
                self.create_polygon(x_left, m, x_right, h//2, x_left, h-m, fill=color, outline=color, width=1)
        elif self.text == "●":
            r = int(self.size * 0.16)
            self.create_oval(w//2-r, h//2-r, w//2+r, h//2+r, fill=color, outline=color)
        else:
            font_size = int(12 * self.zoom)
            if pressed: font_size = int(11 * self.zoom)
            self.create_text(w//2, h//2, text=self.text, fill=self.fg, font=("Segoe UI", font_size, "bold"))

    def create_rounded_rect(self, x1, y1, x2, y2, r, **kwargs):
        return draw_smooth_rounded_rect(self, x1, y1, x2, y2, r, **kwargs)

    def on_press(self, event):
        if self.app and self.app.edit_mode:
            self.drag_start_x = event.x
            self.drag_start_y = event.y
            return "break"
        self.draw(True)
        if self.press_cmd: self.press_cmd()

    def on_drag(self, event):
        if not self.app or not self.app.edit_mode:
            return
        if self.app.layout_mode == "custom":
            new_x = self.winfo_x() + (event.x - self.drag_start_x)
            new_y = self.winfo_y() + (event.y - self.drag_start_y)
            self.place(x=new_x, y=new_y)
            if self.btn_id:
                if self.btn_id not in self.app.button_positions:
                    self.app.button_positions[self.btn_id] = {}
                self.app.button_positions[self.btn_id]["x"] = new_x
                self.app.button_positions[self.btn_id]["y"] = new_y
                self.app.save_settings()
            return "break"

    def on_release(self, event):
        if self.app and self.app.edit_mode:
            return
        self.draw(False)
        if self.release_cmd: 
            self.release_cmd()
        elif self.command: 
            self.command()

class ThemeWindow:
    def __init__(self, navpad):
        self.navpad = navpad
        self.win = tk.Toplevel(navpad.root)
        self.win.title("Theme Customizer")
        self.win.geometry("400x750")
        self.win.configure(bg="#1a1a1a")
        self.win.attributes('-topmost', True)
        self.win.focus_force()

        tk.Label(self.win, text="THEME ENGINE", bg="#1a1a1a", fg="white", font=("Segoe UI", 16, "bold")).pack(pady=10)
        
        # Scrollable area
        canvas = tk.Canvas(self.win, bg="#1a1a1a", highlightthickness=0)
        scrollbar = tk.Scrollbar(self.win, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg="#1a1a1a")
        
        # Keep layout stable by setting the scrollregion properly
        scrollable_frame.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        
        # Lock scrollable_frame width to the canvas width to prevent horizontal glitches
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(canvas_window, width=e.width))
        
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Scroll Wheel (Middle scroll button) bindings for Windows, Mac, and Linux
        def _on_mousewheel(event):
            if event.delta:
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            elif event.num == 4:
                canvas.yview_scroll(-1, "units")
            elif event.num == 5:
                canvas.yview_scroll(1, "units")

        def bind_mousewheel_recursive(widget):
            widget.bind("<MouseWheel>", _on_mousewheel)
            widget.bind("<Button-4>", _on_mousewheel)
            widget.bind("<Button-5>", _on_mousewheel)
            for child in widget.winfo_children():
                bind_mousewheel_recursive(child)

        # Apply to entire window recursively
        bind_mousewheel_recursive(self.win)

        props_frame = scrollable_frame
        
        self.create_section(props_frame, "LAYOUT SETTINGS")
        self.create_toggle(props_frame, "Enable Layout Editing", "edit_mode")
        self.create_slider(props_frame, "Corner Radius", "radius", 0, 64)
        self.create_slider(props_frame, "Global Size Scale", "btn_scale", 50, 150)
        
        self.create_section(props_frame, "PAD COLORS")
        self.create_color_row(props_frame, "Button Color", "btn_bg")
        self.create_color_row(props_frame, "Icon/Text", "btn_fg")
        self.create_color_row(props_frame, "Active BTN", "btn_active_bg")
        self.create_color_row(props_frame, "Button Border", "btn_border")
        self.create_color_row(props_frame, "Pad Background", "pad_bg")
        self.create_color_row(props_frame, "Pad Border", "pad_border")
        
        self.create_section(props_frame, "MINIMIZED (DOT) THEME")
        self.create_slider(props_frame, "Dot Radius Scale", "dot_radius", 5, 40)
        self.create_color_row(props_frame, "Dot Color", "dot_fg")
        self.create_color_row(props_frame, "Dot Background", "dot_bg")
        self.create_color_row(props_frame, "Dot Border", "dot_border")
        
        self.create_section(props_frame, "MINIMIZED BUBBLE CUSTOMIZER")
        self.create_option_menu(props_frame, "Bubble Shape", "min_shape", ["squircle", "circle", "rectangle"])
        self.create_slider(props_frame, "Bubble Radius", "min_radius", 0, 48)
        self.create_slider(props_frame, "Border Width", "min_border_width", 0, 8)
        self.create_slider(props_frame, "Bubble Padding", "min_padding", 2, 20)
        self.create_slider(props_frame, "Button Radius", "min_btn_radius", 0, 24)
        self.create_color_row(props_frame, "Bubble Background", "min_bg")
        self.create_color_row(props_frame, "Bubble Border", "min_border_color")
        self.create_color_row(props_frame, "Icon Color", "min_fg")
        
        self.create_section(props_frame, "ROW THEMING")
        self.create_color_row(props_frame, "Row 1 Icons/Text", "row_color_0")
        self.create_color_row(props_frame, "Row 2 Icons/Text", "row_color_1")
        self.create_color_row(props_frame, "Row 3 Icons/Text", "row_color_2")
        self.create_color_row(props_frame, "Custom Row Colors", "row_color_custom")

        tk.Label(props_frame, text="PRESETS", bg="#1a1a1a", fg="#888", font=("Segoe UI", 10, "bold")).pack(pady=10)
        btn_frame = tk.Frame(props_frame, bg="#1a1a1a")
        btn_frame.pack(pady=5)
        
        tk.Button(btn_frame, text="DEFAULT", command=self.preset_default, bg="#333", fg="white", bd=0, padx=8, pady=5).pack(side="left", padx=3)
        tk.Button(btn_frame, text="MINIMAL", command=self.preset_min, bg="#333", fg="white", bd=0, padx=8, pady=5).pack(side="left", padx=3)
        tk.Button(btn_frame, text="FLAT", command=self.preset_flat, bg="#333", fg="white", bd=0, padx=8, pady=5).pack(side="left", padx=3)
        tk.Button(btn_frame, text="GALAXY", command=self.preset_curvy, bg="#333", fg="white", bd=0, padx=8, pady=5).pack(side="left", padx=3)

        tk.Button(props_frame, text="RESET ALL POSITIONS", command=self.navpad.reset_layout, bg="#442222", fg="white", bd=0, pady=10).pack(fill="x", padx=20, pady=10)

    def create_section(self, parent, text):
        tk.Label(parent, text=text, bg="#1a1a1a", fg="#00ff88", font=("Segoe UI", 8, "bold")).pack(fill="x", pady=(15, 2))

    def create_toggle(self, parent, label, key):
        f = tk.Frame(parent, bg="#1a1a1a")
        f.pack(fill="x", pady=2)
        tk.Label(f, text=label, bg="#1a1a1a", fg="white").pack(side="left")
        btn = tk.Button(f, text="ON" if getattr(self.navpad, key) else "OFF", 
                        command=lambda: self.toggle_key(key, btn),
                        bg="#333", fg="white", bd=0, padx=8)
        btn.pack(side="right", padx=10)

    def toggle_key(self, key, btn):
        val = not getattr(self.navpad, key)
        setattr(self.navpad, key, val)
        btn.config(text="ON" if val else "OFF")
        if key == "edit_mode":
            self.navpad.setup_ui()

    def create_slider(self, parent, label, key, val_min, val_max):
        f = tk.Frame(parent, bg="#1a1a1a")
        f.pack(fill="x", pady=2)
        tk.Label(f, text=label, bg="#1a1a1a", fg="#aaa", font=("Segoe UI", 9)).pack(side="left")
        s = tk.Scale(f, from_=val_min, to=val_max, orient="horizontal", bg="#1a1a1a", fg="white", highlightthickness=0,
                     command=lambda v: self.update_theme(key, float(v) if key == "btn_scale" else int(v)))
        s.set(self.navpad.theme.get(key, 0))
        s.pack(side="right", fill="x", expand=True, padx=10)

    def create_color_row(self, parent, label, key):
        f = tk.Frame(parent, bg="#1a1a1a")
        f.pack(fill="x", pady=5)
        tk.Label(f, text=label, bg="#1a1a1a", fg="#aaa", font=("Segoe UI", 9)).pack(side="left")
        e = tk.Entry(f, bg="#333", fg="white", bd=0, width=12)
        e.insert(0, self.navpad.theme.get(key, "#ffffff"))
        e.pack(side="right", padx=10)
        e.bind("<Return>", lambda e_obj: self.update_theme(key, e.get()))
        e.bind("<FocusOut>", lambda e_obj: self.update_theme(key, e.get()))

    def create_option_menu(self, parent, label, key, options):
        f = tk.Frame(parent, bg="#1a1a1a")
        f.pack(fill="x", pady=2)
        tk.Label(f, text=label, bg="#1a1a1a", fg="#aaa", font=("Segoe UI", 9)).pack(side="left")
        
        var = tk.StringVar(self.win)
        var.set(self.navpad.theme.get(key, options[0]))
        
        def on_select(*args):
            self.update_theme(key, var.get())
            
        var.trace_add("write", on_select)
        
        om = tk.OptionMenu(f, var, *options)
        om.config(bg="#333", fg="white", bd=0, highlightthickness=0, activebackground="#444", activeforeground="white")
        om["menu"].config(bg="#333", fg="white", activebackground="#444")
        om.pack(side="right", padx=10)

    def update_theme(self, key, val):
        current_val = self.navpad.theme.get(key)
        if current_val == val:
            return
            
        self.navpad.theme[key] = val
        self.navpad.save_settings()
        
        # Debounce setup_ui to make theme adjustments buttery smooth and zero lag
        if hasattr(self, "_update_timer") and self._update_timer is not None:
            try:
                self.win.after_cancel(self._update_timer)
            except:
                pass
        self._update_timer = self.win.after(100, self._apply_update)

    def _apply_update(self):
        self._update_timer = None
        self.navpad.setup_ui()
        self.navpad.update_geometry()

    def preset_default(self):
        self.navpad.theme.update({
            "radius": 16,
            "btn_bg": "#1a1a1a",
            "btn_active_bg": "#444444",
            "btn_fg": "#ffffff",
            "btn_border": "",
            "pad_bg": "#121212",
            "pad_border": "#333333",
            "btn_scale": 75,
            "dot_radius": 10,
            "dot_fg": "#ffffff",
            "dot_bg": "#1a1a1a",
            "dot_border": "#333333",
            "row_color_0": "#ff4444",
            "row_color_1": "#00ff88",
            "row_color_2": "#44aaff",
            "row_color_custom": "#cc88ff",
            "min_shape": "squircle",
            "min_bg": "#1a1a1a",
            "min_border_color": "#333333",
            "min_border_width": 1,
            "min_radius": 16,
            "min_fg": "#ffffff",
            "min_btn_radius": 8,
            "min_padding": 6
        })
        self.apply_and_refresh()

    def preset_min(self):
        self.navpad.theme.update({"radius": 2, "btn_bg": "#121212", "btn_fg": "#ffffff", "btn_border": "#222", "pad_bg": "#0a0a0a", "pad_border": "#111", "btn_scale": 70})
        self.apply_and_refresh()
        
    def preset_flat(self):
        self.navpad.theme.update({"radius": 6, "btn_bg": "#2a2a2a", "btn_fg": "#00ff88", "btn_border": "#00ff88", "pad_bg": "#1a1a1a", "pad_border": "#333", "btn_scale": 75})
        self.apply_and_refresh()
        
    def preset_curvy(self):
        self.navpad.theme.update({"radius": 100, "btn_bg": "#222222", "btn_fg": "#44aaff", "btn_border": "#44aaff", "pad_bg": "#121212", "pad_border": "#333", "btn_scale": 85, "dot_radius": 25, "dot_fg": "#44aaff"})
        self.apply_and_refresh()
        
    def apply_and_refresh(self):
        self.navpad.save_settings()
        self.navpad.setup_ui()
        self.win.destroy()
        self.navpad.open_theme()

class FloatingNavPad:
    def __init__(self, root):
        self.root = root
        self.root.title("NavPad Pro")
        self.zoom = 1.0
        self.alpha = 0.85
        self.is_expanded = False
        self.is_playing = False
        self.moved = False
        self.offset_x = 0
        self.offset_y = 0
        
        self.edit_mode = False
        self.layout_mode = "grid" # "grid" or "custom"
        self.button_positions = {} # {id: {x:.., y:..}}
        
        # Default mappings
        self.mappings = {
            "up": "up", "down": "down", "left": "left", "right": "right",
            "center": "space", "vol_up": "backspace", "vol_down": "alt+s", "mute": "enter",
            "c1": "printscreen", "c2": "esc", "c3": "win+alt", "c4": "alt+shift+s",
            "c5": "win+ctrl+shift+b", "c6": "ctrl+esc", "c7": "f", "c8": "win+d",
            "c9": "ctrl+c", "c10": "ctrl+v", "c11": "ctrl+a", "c12": "ctrl+x"
        }
        
        # Default theme
        self.theme = {
            "radius": 16,
            "btn_bg": "#1a1a1a",
            "btn_active_bg": "#444444",
            "btn_fg": "#ffffff",
            "btn_border": "",
            "pad_bg": "#121212",
            "pad_border": "#333333",
            "btn_scale": 75,
            "dot_radius": 10,
            "dot_fg": "#ffffff",
            "dot_bg": "#1a1a1a",
            "dot_border": "#333333",
            "row_color_0": "#ff4444",
            "row_color_1": "#00ff88",
            "row_color_2": "#44aaff",
            "row_color_custom": "#cc88ff",
            
            # New minimized bubble properties
            "min_shape": "squircle",
            "min_bg": "#1a1a1a",
            "min_border_color": "#333333",
            "min_border_width": 1,
            "min_radius": 16,
            "min_fg": "#ffffff",
            "min_btn_radius": 8,
            "min_padding": 6
        }
        
        self.theme_window = None
        self.load_settings()
        
        self.root.attributes('-topmost', True)
        self.root.overrideredirect(True)
        self.root.attributes('-alpha', self.alpha)
        
        # Windows specific: Rounded corners via transparent color key
        self.root.config(bg='#000001')
        self.root.attributes('-transparentcolor', '#000001')
        
        # Make window non-activatable so it doesn't steal focus from video players
        self.set_no_focus()
        
        # Periodic topmost enforcement watchdog to prevent losing PiP status when Chrome menus or other overlays open
        self.enforce_topmost_loop()
        
        self.setup_ui()
        self.update_geometry()
        
        # Dragging support
        self.root.bind("<Button-1>", self.start_move)
        self.root.bind("<B1-Motion>", self.do_move)
        self.root.bind("<ButtonRelease-1>", self.stop_move)
        self.root.bind("<Enter>", lambda e: self.set_no_focus())

    def load_settings(self):
        # Initial defaults
        defaults = {
            "vol_up": "backspace", "mute": "enter", "vol_down": "alt+s",
            "c1": "printscreen", "c2": "esc", "c3": "win+alt", "c4": "alt+shift+s",
            "c5": "win+ctrl+shift+b", "c6": "ctrl+esc", "c7": "f", "c8": "win+d",
            "c9": "ctrl+c", "c10": "ctrl+v", "c11": "ctrl+a", "c12": "ctrl+x"
        }
        for k, v in defaults.items():
            if k not in self.mappings:
                self.mappings[k] = v
                
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    if "mappings" in data: self.mappings.update(data["mappings"])
                    if "zoom" in data: self.zoom = data["zoom"]
                    if "alpha" in data: self.alpha = data["alpha"]
                    if "theme" in data: self.theme.update(data["theme"])
                    if "button_positions" in data: self.button_positions.update(data["button_positions"])
                    if "layout_mode" in data: self.layout_mode = data["layout_mode"]
            except: pass
            
        if self.theme.get("dot_fg") == "#00ff88":
            self.theme["dot_fg"] = "#ffffff"
        self.save_settings()

    def edit_shortcut(self, key):
        current_val = self.mappings.get(key, "")
        prompt_text = f"Enter key combination for {key.upper()}:\\n(e.g., 'space', 'ctrl+esc', 'win+alt', 'f', 'win+ctrl+shift+b')"
        new_val = simpledialog.askstring("Edit Shortcut", prompt_text, initialvalue=current_val)
        if new_val is not None:
            self.mappings[key] = new_val.strip().lower()
            self.save_settings()
            self.setup_ui()

    def show_shortcut_menu(self, btn_id, event):
        menu = tk.Menu(self.root, tearoff=0, bg="#1a1a1a", fg="white", activebackground="#00ff88", activeforeground="black")
        
        presets = [
            ("1. Screenshot (Print Screen)", "printscreen"),
            ("2. Escape (ESC)", "esc"),
            ("3. Windows + Alt (Win+Alt)", "win+alt"),
            ("4. Alt + Shift + S", "alt+shift+s"),
            ("5. Reset GPU (Win+Ctrl+Shift+B)", "win+ctrl+shift+b"),
            ("6. Start / Task (Ctrl+Esc)", "ctrl+esc"),
            ("7. Key: F (Fullscreen Toggle)", "f"),
            ("8. Show Desktop (Win+D)", "win+d"),
            ("Backspace", "backspace"),
            ("Enter", "enter"),
            ("Alt + S", "alt+s"),
            ("Fullscreen (F11)", "f11"),
            ("Copy (Ctrl+C)", "ctrl+c"),
            ("Paste (Ctrl+V)", "ctrl+v"),
            ("Select All (Ctrl+A)", "ctrl+a"),
            ("Cut (Ctrl+X)", "ctrl+x"),
            ("Task Manager (Ctrl+Shift+Esc)", "ctrl+shift+esc"),
            ("Play / Pause (Space)", "space"),
            ("Close Window (Alt+F4)", "alt+f4"),
            ("Switch Window (Alt+Tab)", "alt+tab"),
            ("Mute (Volume Mute)", "volumemute"),
            ("Volume Up", "volumeup"),
            ("Volume Down", "volumedown"),
            ("Media Next", "nexttrack"),
            ("Media Prev", "prevtrack"),
            ("Key: D", "d")
        ]
        
        current_val = self.mappings.get(btn_id, "").lower()
        
        def make_select_preset(val):
            return lambda: self.set_shortcut(btn_id, val)
            
        for label, val in presets:
            chk = "✓ " if current_val == val else "   "
            menu.add_command(label=f"{chk}{label}", command=make_select_preset(val))
            
        menu.add_separator()
        menu.add_command(label="   Custom Shortcut...", command=lambda: self.edit_shortcut(btn_id))
        
        # Option to reset to factory default
        factory_defaults = {
            "up": "up", "down": "down", "left": "left", "right": "right",
            "center": "space", "vol_up": "backspace", "vol_down": "alt+s", "mute": "enter",
            "c1": "printscreen", "c2": "esc", "c3": "win+alt", "c4": "alt+shift+s",
            "c5": "win+ctrl+shift+b", "c6": "ctrl+esc", "c7": "f", "c8": "win+d",
            "c9": "ctrl+c", "c10": "ctrl+v", "c11": "ctrl+a", "c12": "ctrl+x"
        }
        if btn_id in factory_defaults:
            def_val = factory_defaults[btn_id]
            menu.add_command(label=f"↺  Reset to Default ({def_val})", command=lambda: self.set_shortcut(btn_id, def_val))
        
        menu.post(event.x_root, event.y_root)

    def set_shortcut(self, btn_id, val):
        self.mappings[btn_id] = val
        self.save_settings()
        self.setup_ui()

    def save_settings(self):
        try:
            data = {
                "mappings": self.mappings,
                "zoom": self.zoom,
                "alpha": self.alpha,
                "theme": self.theme,
                "button_positions": self.button_positions,
                "layout_mode": self.layout_mode
            }
            with open(CONFIG_FILE, "w") as f:
                json.dump(data, f)
        except: pass

    def enforce_topmost_loop(self):
        # Periodically assert topmost and un-entangle from foreign context menus / popup overlays (every 1.5 seconds)
        try:
            self.set_no_focus()
        except:
            pass
        self.root.after(1500, self.enforce_topmost_loop)

    def set_no_focus(self):
        # Reassert Tkinter topmost state
        try:
            self.root.attributes('-topmost', True)
        except:
            pass

        # Windows-specific deep Z-order & style enforcement
        if not IS_WINDOWS:
            return

        GWL_EXSTYLE = -20
        WS_EX_NOACTIVATE = 0x08000000
        WS_EX_TOOLWINDOW = 0x00000080
        WS_EX_TOPMOST = 0x00000008
        SWP_NOACTIVATE = 0x0010
        SWP_NOMOVE = 0x0002
        SWP_NOSIZE = 0x0001
        SWP_SHOWWINDOW = 0x0040
        HWND_TOPMOST = -1
        
        try:
            hwnd = self.root.winfo_id()
            if not hwnd:
                return

            # Apply extended styles (non-activating, toolwindow, topmost)
            style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST)
            
            # Apply to root window handle if distinct
            root_hwnd = ctypes.windll.user32.GetAncestor(hwnd, 2) # GA_ROOT
            if root_hwnd and root_hwnd != hwnd:
                style_root = ctypes.windll.user32.GetWindowLongW(root_hwnd, GWL_EXSTYLE)
                ctypes.windll.user32.SetWindowLongW(root_hwnd, GWL_EXSTYLE, style_root | WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TOPMOST)
            
            # Force the window to top of the Z-order without activating it or stealing focus
            target_hwnd = root_hwnd if root_hwnd else hwnd
            ctypes.windll.user32.SetWindowPos(target_hwnd, HWND_TOPMOST, 0, 0, 0, 0, 
                                            SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)
        except:
            pass

    def update_geometry(self):
        dot_rad = self.theme.get("dot_radius", 10)
        btn_size = int(dot_rad * 4 * self.zoom)
        padding = int(self.theme.get("min_padding", 6) * self.zoom)
        gap = int(4 * self.zoom)
        
        if self.is_expanded:
            width = int(280 * self.zoom)
            height = int(440 * self.zoom)
        else:
            width = padding * 2 + 4 * btn_size + 3 * gap
            height = padding * 2 + btn_size
        
        curr_x = self.root.winfo_x()
        curr_y = self.root.winfo_y()
        
        # If it's the first run (or offscreen), center it
        if curr_x < -1000 or curr_x > 5000:
            sw = self.root.winfo_screenwidth()
            sh = self.root.winfo_screenheight()
            curr_x = sw - width - 50
            curr_y = sh // 2 - height // 2
            
        self.root.geometry(f"{width}x{height}+{curr_x}+{curr_y}")
        # Re-apply no-focus after geometry change
        self.root.after(50, self.set_no_focus)

    def setup_ui(self):
        for widget in self.root.winfo_children():
            # Crucial: Don't destroy our floating theme window
            if not isinstance(widget, tk.Toplevel):
                widget.destroy()
            
        if not self.is_expanded:
            # Collapsed dot mode
            container = tk.Frame(self.root, bg="#000001", takefocus=0)
            container.pack(expand=True, fill="both")
            
            self.min_canvas = tk.Canvas(container, bg="#000001", highlightthickness=0, bd=0, takefocus=0)
            self.min_canvas.place(relx=0, rely=0, relwidth=1, relheight=1)
            
            # Single-canvas event handlers for dragging and button triggers
            self.min_canvas.bind("<Button-1>", self.on_min_press)
            self.min_canvas.bind("<B1-Motion>", self.on_min_drag)
            self.min_canvas.bind("<ButtonRelease-1>", self.on_min_release)
            
            self.pressed_btn = None
            
            # Bind configure to draw
            self.min_canvas.bind("<Configure>", lambda e: self.draw_min_mode())
        else:
            # Expanded grid mode
            container = tk.Frame(self.root, bg="#000001", takefocus=0)
            container.pack(expand=True, fill="both")
            
            # Background canvas handles dragging
            self.bg_canvas = tk.Canvas(container, bg="#000001", highlightthickness=0, bd=0, takefocus=0)
            self.bg_canvas.place(relx=0, rely=0, relwidth=1, relheight=1)
            
            self.bg_canvas.bind("<Button-1>", self.start_move)
            self.bg_canvas.bind("<B1-Motion>", self.do_move)
            
            def draw_bg(e):
                self.bg_canvas.delete("all")
                w, h = e.width, e.height
                r = int(40 * self.zoom)
                # Outer border
                self.bg_canvas.create_rounded_rect(4, 4, w-4, h-4, r, fill=self.theme["pad_bg"], 
                                                 outline=self.theme["pad_border"], width=2)
            
            self.bg_canvas.bind("<Configure>", draw_bg)
            
            # Helper for rounded bg
            self.bg_canvas.create_rounded_rect = lambda x1, y1, x2, y2, r, **kw: \
                self.bg_canvas.create_polygon(get_rounded_rect_points(x1, y1, x2, y2, r, steps=16), **kw, smooth=False)

            content_parent = tk.Frame(container, bg=self.theme["pad_bg"], takefocus=0)
            content_parent.place(relx=0.5, rely=0.45, anchor="center", relwidth=0.92, relheight=0.80)
            for col in range(4):
                content_parent.grid_columnconfigure(col, weight=1)
            for r in range(6):
                content_parent.grid_rowconfigure(r, weight=1)
            
            # Standard button list
            btns = [
                ("Z-", 0, 0, self.theme.get("row_color_0", "#ff4444"), "zoom_out"),
                ("▲", 0, 1, self.theme.get("row_color_1", "#00ff88"), "up"),
                ("Z+", 0, 2, self.theme.get("row_color_2", "#44aaff"), "zoom_in"),
                ("BKSP", 0, 3, self.theme.get("row_color_0", "#ff4444"), "vol_up"),
                ("◀", 1, 0, self.theme.get("row_color_1", "#00ff88"), "left"),
                ("⏵⏸", 1, 1, self.theme.get("btn_fg", "#ffffff"), "center"),
                ("▶", 1, 2, self.theme.get("row_color_1", "#00ff88"), "right"),
                ("ENT", 1, 3, self.theme.get("row_color_0", "#ff4444"), "mute"),
                ("A-", 2, 0, self.theme.get("row_color_0", "#ff4444"), "alpha_out"),
                ("▼", 2, 1, self.theme.get("row_color_1", "#00ff88"), "down"),
                ("A+", 2, 2, self.theme.get("row_color_2", "#44aaff"), "alpha_in"),
                ("A+S", 2, 3, self.theme.get("row_color_0", "#ff4444"), "vol_down"),
                ("C1", 3, 0, self.theme.get("row_color_custom", "#cc88ff"), "c1"),
                ("C2", 3, 1, self.theme.get("row_color_custom", "#cc88ff"), "c2"),
                ("C3", 3, 2, self.theme.get("row_color_custom", "#cc88ff"), "c3"),
                ("C4", 3, 3, self.theme.get("row_color_custom", "#cc88ff"), "c4"),
                ("C5", 4, 0, self.theme.get("row_color_custom", "#cc88ff"), "c5"),
                ("C6", 4, 1, self.theme.get("row_color_custom", "#cc88ff"), "c6"),
                ("C7", 4, 2, self.theme.get("row_color_custom", "#cc88ff"), "c7"),
                ("C8", 4, 3, self.theme.get("row_color_custom", "#cc88ff"), "c8"),
                ("C9", 5, 0, self.theme.get("row_color_custom", "#cc88ff"), "c9"),
                ("C10", 5, 1, self.theme.get("row_color_custom", "#cc88ff"), "c10"),
                ("C11", 5, 2, self.theme.get("row_color_custom", "#cc88ff"), "c11"),
                ("C12", 5, 3, self.theme.get("row_color_custom", "#cc88ff"), "c12"),
            ]

            default_key_mappings = {
                "up": "up", "down": "down", "left": "left", "right": "right",
                "center": "space", "vol_up": "backspace", "vol_down": "alt+s", "mute": "enter"
            }

            for text, r, c, color, key in btns:
                if key in ["zoom_out", "zoom_in", "alpha_out", "alpha_in"]:
                    cmd = getattr(self, key)
                    mapping = None
                else:
                    cmd = None
                    mapping = key
                    if key.startswith("c"):
                        text = self.get_custom_label(key)
                    elif key in self.mappings:
                        # If a non-custom button (like vol_up, vol_down, mute, up, down, etc.) has been customized
                        current_mapped = self.mappings.get(key)
                        orig_mapped = default_key_mappings.get(key)
                        if current_mapped != orig_mapped:
                            text = self.get_custom_label(key)
                self.add_btn(content_parent, text, r, c, color, mapping, cmd, btn_id=key)

            # Footer buttons
            footer = tk.Frame(container, bg=self.theme["pad_bg"])
            footer.place(relx=0.5, rely=0.92, anchor="center")
            btn_zoom = self.zoom * (self.theme["btn_scale"] / 100.0)
            rad = self.theme["radius"]
            RoundedButton(footer, "QUIT", command=self.root.destroy, zoom=btn_zoom, fg="#ff4444", border_color="#ff4444", bg=self.theme["btn_bg"], radius=rad, app=self).pack(side="left", padx=2)
            RoundedButton(footer, "THEME", command=self.open_theme, zoom=btn_zoom, fg="#44aaff", border_color="#44aaff", bg=self.theme["btn_bg"], radius=rad, app=self).pack(side="left", padx=2)
            RoundedButton(footer, "HIDE", command=self.toggle_expand, zoom=btn_zoom, fg="#00ff88", border_color="#00ff88", bg=self.theme["btn_bg"], radius=rad, app=self).pack(side="left", padx=2)

    def open_theme(self):
        # Prevent multiple theme windows or re-open if closed
        if self.theme_window:
            try:
                self.theme_window.win.lift()
                self.theme_window.win.focus_force()
                return
            except:
                pass
        self.theme_window = ThemeWindow(self)

    def get_custom_label(self, mapping_key):
        key = self.mappings.get(mapping_key)
        if not key: return mapping_key.upper()
        
        # Explicit overrides for nice display
        if key == "printscreen": return "PRT"
        if key == "esc": return "ESC"
        if key == "win+alt": return "W+A"
        if key == "f11": return "F11"
        if key == "alt+s": return "A+S"
        if key == "alt+shift+s": return "A+SS"
        if key == "backspace": return "BKSP"
        if key == "enter": return "ENT"
        if key == "win+ctrl+shift+b": return "W+B"
        if key == "ctrl+esc": return "C+ES"
        if key == "ctrl+shift+esc": return "TM"
        if key == "f": return "F"
        if key == "win+d": return "W+D"
        if key == "space": return "SPC"
        if key == "ctrl+c": return "CPY"
        if key == "ctrl+v": return "PST"
        if key == "ctrl+a": return "ALL"
        if key == "ctrl+x": return "CUT"
        if key == "volumeup": return "V+"
        if key == "volumedown": return "V-"
        if key == "volumemute": return "MT"
        if key == "nexttrack": return "NXT"
        if key == "prevtrack": return "PRV"
        if key == "alt+f4": return "A+F4"
        if key == "alt+tab": return "TAB"
        
        # Format combo labels nicer
        if "+" in key:
            parts = key.split("+")
            if len(parts) > 2:
                return f"{parts[0][0].upper()}+{parts[-1].upper()[:2]}"
            return f"{parts[0][:1].upper()}+{parts[1][:2].upper()}"
        
        return key[:3].upper()

    def add_btn(self, parent, text, row, col, color, mapping_key=None, cmd=None, btn_id=None):
        if mapping_key:
            press = lambda: self.trigger_down(mapping_key)
            release = lambda: self.trigger_up(mapping_key)
            command = None
        else:
            press = release = None
            command = cmd
            
        btn_scale = self.theme.get("btn_scale", 75) / 100.0
        btn = RoundedButton(parent, text, command=command, press_cmd=press, release_cmd=release,
                            zoom=self.zoom*btn_scale, fg=color, border_color=self.theme["btn_border"], 
                            bg=self.theme["btn_bg"], radius=self.theme["radius"], btn_id=btn_id, app=self)
        
        if self.layout_mode == "custom" and btn_id in self.button_positions:
            p = self.button_positions[btn_id]
            btn.place(x=p["x"], y=p["y"])
        else:
            btn.grid(row=row, column=col, padx=3, pady=3)

    def reset_layout(self):
        self.button_positions = {}
        self.save_settings()
        self.setup_ui()

    def toggle_expand(self):
        if not self.moved:
            self.is_expanded = not self.is_expanded
            self.update_geometry()
            self.setup_ui()

    def trigger_down(self, mapping_key):
        if mapping_key == "center":
            self.is_playing = not self.is_playing
            if not self.is_expanded:
                self.draw_min_mode()
            else:
                def redraw_play_buttons(parent):
                    for widget in parent.winfo_children():
                        if isinstance(widget, RoundedButton) and widget.text == "⏵⏸":
                            widget.draw()
                        elif isinstance(widget, tk.Frame) or isinstance(widget, tk.LabelFrame):
                            redraw_play_buttons(widget)
                redraw_play_buttons(self.root)

        key = self.mappings.get(mapping_key)
        if not key: return
        
        # Handle combinations
        if "+" in key:
            parts = [p.strip() for p in key.split("+")]
            for p in parts: win_key_down(p)
            return

        win_key_down(key)

    def trigger_up(self, mapping_key):
        key = self.mappings.get(mapping_key)
        if not key: return
        
        # Handle combinations
        if "+" in key:
            parts = [p.strip() for p in key.split("+")]
            for p in reversed(parts): win_key_up(p)
            return

        win_key_up(key)

    def zoom_in(self):
        self.zoom = min(1.5, self.zoom + 0.1)
        self.save_settings()
        self.update_geometry()
        self.setup_ui()

    def zoom_out(self):
        self.zoom = max(0.5, self.zoom - 0.1)
        self.save_settings()
        self.update_geometry()
        self.setup_ui()

    def alpha_in(self):
        self.alpha = min(1.0, self.alpha + 0.1)
        self.save_settings()
        self.root.attributes('-alpha', self.alpha)

    def alpha_out(self):
        self.alpha = max(0.2, self.alpha - 0.1)
        self.save_settings()
        self.root.attributes('-alpha', self.alpha)

    def start_move(self, event):
        # Use root coordinates for stable offset calculation to prevent jumping
        self.offset_x = event.x_root - self.root.winfo_x()
        self.offset_y = event.y_root - self.root.winfo_y()
        self.moved = False

    def do_move(self, event):
        # Calculate new position using screen coordinates
        x = event.x_root - self.offset_x
        y = event.y_root - self.offset_y
        
        # Only move if we've dragged more than a small threshold
        if not self.moved:
            curr_x = self.root.winfo_x()
            curr_y = self.root.winfo_y()
            # Increased threshold to prevent accidental drags during clicks
            if abs(x - curr_x) > 15 or abs(y - curr_y) > 15:
                self.moved = True
        
        if self.moved:
            self.root.geometry(f"+{x}+{y}")

    def stop_move(self, event):
        pass

    def get_min_button_at(self, x, y):
        dot_rad = self.theme.get("dot_radius", 10)
        btn_size = int(dot_rad * 4 * self.zoom)
        padding = int(self.theme.get("min_padding", 6) * self.zoom)
        gap = int(4 * self.zoom)
        
        for i in range(4):
            bx1 = padding + i * (btn_size + gap)
            by1 = padding
            bx2 = bx1 + btn_size
            by2 = by1 + btn_size
            if bx1 <= x <= bx2 and by1 <= y <= by2:
                return i
        return None

    def on_min_press(self, event):
        self.pressed_btn = self.get_min_button_at(event.x, event.y)
        if self.pressed_btn is not None:
            self.draw_min_mode()
        else:
            self.start_move(event)

    def on_min_drag(self, event):
        if hasattr(self, "pressed_btn") and self.pressed_btn is not None:
            btn = self.get_min_button_at(event.x, event.y)
            if btn != self.pressed_btn:
                self.pressed_btn = None
                self.draw_min_mode()
        else:
            self.do_move(event)

    def on_min_release(self, event):
        if hasattr(self, "pressed_btn") and self.pressed_btn is not None:
            btn = self.pressed_btn
            self.pressed_btn = None
            self.draw_min_mode()
            
            if btn == 0:
                self.toggle_expand()
            elif btn == 1:
                self.trigger_down("left")
                self.root.after(50, lambda: self.trigger_up("left"))
            elif btn == 2:
                self.trigger_down("center")
                self.root.after(50, lambda: self.trigger_up("center"))
            elif btn == 3:
                self.trigger_down("right")
                self.root.after(50, lambda: self.trigger_up("right"))
        else:
            self.stop_move(event)

    def draw_min_mode(self):
        if not hasattr(self, "min_canvas") or not self.min_canvas.winfo_exists():
            return
            
        self.min_canvas.delete("all")
        
        # Get dimensions and theme properties
        w = self.min_canvas.winfo_width()
        h = self.min_canvas.winfo_height()
        if w <= 1 or h <= 1:
            # Fallback to calculated geometry
            dot_rad = self.theme.get("dot_radius", 10)
            btn_size = int(dot_rad * 4 * self.zoom)
            padding = int(self.theme.get("min_padding", 6) * self.zoom)
            gap = int(4 * self.zoom)
            w = padding * 2 + 4 * btn_size + 3 * gap
            h = padding * 2 + btn_size

        min_shape = self.theme.get("min_shape", "squircle")
        min_bg = self.theme.get("min_bg", self.theme.get("dot_bg", "#1a1a1a"))
        min_border_color = self.theme.get("min_border_color", self.theme.get("dot_border", "#333333"))
        min_border_width = int(self.theme.get("min_border_width", 1))
        min_radius = int(self.theme.get("min_radius", 16) * self.zoom)
        
        # 1. Draw outer bubble background and border
        inset = min_border_width // 2 + 1
        if min_shape == "circle":
            r = h // 2
            draw_smooth_rounded_rect(self.min_canvas, inset, inset, w-inset, h-inset, r, fill=min_bg, outline=min_border_color, width=min_border_width)
        elif min_shape == "rectangle":
            draw_smooth_rounded_rect(self.min_canvas, inset, inset, w-inset, h-inset, 0, fill=min_bg, outline=min_border_color, width=min_border_width)
        else: # squircle
            draw_smooth_rounded_rect(self.min_canvas, inset, inset, w-inset, h-inset, min_radius, fill=min_bg, outline=min_border_color, width=min_border_width)
            
        # 2. Draw each of the 4 buttons
        dot_rad = self.theme.get("dot_radius", 10)
        btn_size = int(dot_rad * 4 * self.zoom)
        padding = int(self.theme.get("min_padding", 6) * self.zoom)
        gap = int(4 * self.zoom)
        min_fg = self.theme.get("min_fg", self.theme.get("dot_fg", "#ffffff"))
        btn_radius = int(self.theme.get("min_btn_radius", 8) * self.zoom)
        btn_active_bg = self.theme.get("btn_active_bg", "#444444")
        
        pressed_btn = getattr(self, "pressed_btn", None)
        
        for i in range(4):
            bx1 = padding + i * (btn_size + gap)
            by1 = padding
            bx2 = bx1 + btn_size
            by2 = by1 + btn_size
            
            # Draw highlight if pressed
            if pressed_btn == i:
                hl_pad = 2 * self.zoom
                draw_smooth_rounded_rect(self.min_canvas, bx1 + hl_pad, by1 + hl_pad, bx2 - hl_pad, by2 - hl_pad, btn_radius, fill=btn_active_bg, outline="")
                
            # Draw button content (icons)
            cx = (bx1 + bx2) // 2
            cy = (by1 + by2) // 2
            
            # Calculate icon margin based on button size (e.g. 32% margin)
            m = int(btn_size * 0.32)
            
            if i == 0:
                # Dot (●)
                r_dot = int(4 * self.zoom * (dot_rad / 10.0))
                if r_dot < 3: r_dot = 3
                self.min_canvas.create_oval(cx - r_dot, cy - r_dot, cx + r_dot, cy + r_dot, fill=min_fg, outline=min_fg)
            elif i == 1:
                # Left arrow (◀)
                x_left = cx - (btn_size // 2) + m
                x_right = cx + (btn_size // 2) - m
                y_top = cy - (btn_size // 2) + m
                y_bottom = cy + (btn_size // 2) - m
                self.min_canvas.create_polygon(x_left, cy, x_right, y_top, x_right, y_bottom, fill=min_fg, outline=min_fg, width=1)
            elif i == 2:
                # Play/Pause
                is_playing = getattr(self, "is_playing", False)
                if is_playing:
                    # Parallel lines (Pause symbol)
                    bar_w = max(2, int(3 * self.zoom))
                    bar_gap = max(2, int(4 * self.zoom))
                    y_top = cy - (btn_size // 2) + m
                    y_bottom = cy + (btn_size // 2) - m
                    
                    self.min_canvas.create_rectangle(cx - bar_gap//2 - bar_w, y_top, cx - bar_gap//2, y_bottom, fill=min_fg, outline="")
                    self.min_canvas.create_rectangle(cx + bar_gap//2, y_top, cx + bar_gap//2 + bar_w, y_bottom, fill=min_fg, outline="")
                else:
                    # Triangle pointing right (Play symbol)
                    x_left = cx - (btn_size // 2) + m + int(2 * self.zoom)
                    x_right = cx + (btn_size // 2) - m + int(2 * self.zoom)
                    y_top = cy - (btn_size // 2) + m
                    y_bottom = cy + (btn_size // 2) - m
                    self.min_canvas.create_polygon(x_left, y_top, x_right, cy, x_left, y_bottom, fill=min_fg, outline=min_fg, width=1)
            elif i == 3:
                # Right arrow (▶)
                x_left = cx - (btn_size // 2) + m
                x_right = cx + (btn_size // 2) - m
                y_top = cy - (btn_size // 2) + m
                y_bottom = cy + (btn_size // 2) - m
                self.min_canvas.create_polygon(x_right, cy, x_left, y_top, x_left, y_bottom, fill=min_fg, outline=min_fg, width=1)

if __name__ == "__main__":
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.0
    root = tk.Tk()
    app = FloatingNavPad(root)
    root.mainloop()`;

export default function App() {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Content: Instructions */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter text-white">
              NavPad <span className="text-emerald-400">Pro</span>
            </h1>
            <p className="text-xl text-zinc-400 leading-relaxed max-w-md">
              A collapsible, Assistive Touch-style automation tool for Windows. Media, navigation, and custom macros at your fingertips.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="mt-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors">
                <Terminal className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">One-Click Setup</h3>
                <code className="text-sm bg-zinc-900 px-2 py-1 rounded text-emerald-300 border border-zinc-800 mt-2 block w-fit">
                  pip install pyautogui
                </code>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="mt-1 p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-emerald-500/50 transition-colors">
                <Maximize2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Collapsible Interface</h3>
                <p className="text-sm text-zinc-500">Minimize to a subtle dot when not in use. Expand instantly for full control.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-4">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied Script' : 'Copy Python Script'}
            </button>
            
            <a 
              href="https://www.python.org/downloads/" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-full transition-all border border-white/5"
            >
              Download Python
            </a>
          </div>

          {/* Setup Guide */}
          <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              Quick Start Guide
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="text-emerald-500 font-mono">01.</span>
                <span>Install Python and run <code className="text-emerald-400">pip install pyautogui</code>.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-500 font-mono">02.</span>
                <span>Save the script as <code className="text-emerald-400">navpad.py</code> and run it.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-500 font-mono">03.</span>
                <span>Customize every detail — from corners to colors — in the THEME menu.</span>
              </li>
              <li className="flex gap-3 pt-2 border-t border-zinc-800">
                <span className="text-emerald-500 font-mono">EXE.</span>
                <span>Build EXE: <code className="text-emerald-400">pyinstaller --onefile --noconsole navpad.py</code></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Content: Interactive Preview */}
        <div className="relative flex justify-center items-center h-[500px]">
          <AnimatePresence mode="wait">
            {!isExpanded ? (
              <motion.div
                key="dot"
                layoutId="pad"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                className="flex items-center gap-1.5 p-1.5 bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl shadow-white/5"
              >
                {/* Minimized Dot (Leftmost) */}
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: '#1f1f23' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExpanded(true)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer text-white"
                  title="Expand NavPad"
                >
                  <div className="w-3.5 h-3.5 bg-white rounded-full animate-pulse" />
                </motion.button>

                {/* Left Arrow */}
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: '#1f1f23' }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer text-white"
                  title="Left Arrow"
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>

                {/* Play/Pause Space Bar */}
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: '#1f1f23' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer text-white"
                  title="Play / Pause"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white" />}
                </motion.button>

                {/* Right Arrow */}
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: '#1f1f23' }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer text-white"
                  title="Right Arrow"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div 
                key="expanded"
                layoutId="pad"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-72 h-[520px] bg-[#121212] rounded-[40px] border-2 border-zinc-800 shadow-2xl flex flex-col items-center justify-center p-6"
              >
                <div className="grid grid-cols-4 gap-2 w-full mb-3">
                  {/* Row 0 */}
                  <PreviewButton label="Z-" color="text-red-400" borderColor="border-zinc-800" />
                  <PreviewButton icon={<ChevronUp className="w-5 h-5" />} color="text-emerald-400" borderColor="border-zinc-800" />
                  <PreviewButton label="Z+" color="text-blue-400" borderColor="border-zinc-800" />
                  <PreviewButton label="BKSP" color="text-orange-400" borderColor="border-zinc-800" />

                  {/* Row 1 */}
                  <PreviewButton icon={<ChevronLeft className="w-5 h-5" />} color="text-emerald-400" borderColor="border-zinc-800" />
                  <div className="contents cursor-pointer" onClick={() => setIsPlaying(!isPlaying)}>
                    <PreviewButton icon={isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />} color="text-white" borderColor="border-zinc-800" />
                  </div>
                  <PreviewButton icon={<ChevronRight className="w-5 h-5" />} color="text-emerald-400" borderColor="border-zinc-800" />
                  <PreviewButton label="ENT" color="text-orange-400" borderColor="border-zinc-800" />

                  {/* Row 2 */}
                  <PreviewButton label="A-" color="text-orange-400" borderColor="border-zinc-800" />
                  <PreviewButton icon={<ChevronDown className="w-5 h-5" />} color="text-emerald-400" borderColor="border-zinc-800" />
                  <PreviewButton label="A+" color="text-orange-400" borderColor="border-zinc-800" />
                  <PreviewButton label="A+S" color="text-orange-400" borderColor="border-zinc-800" />

                  {/* Row 3: Custom Mappable Buttons Row 1 (1: Print Screen, 2: Escape, 3: Win+Alt, 4: Alt+Shift+S) */}
                  <PreviewButton label="PRT" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="ESC" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="W+A" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="A+SS" color="text-purple-400" borderColor="border-zinc-800" />

                  {/* Row 4: Custom Mappable Buttons Row 2 (5: Win+Ctrl+Shift+B, 6: Ctrl+Esc, 7: F, 8: Win+D) */}
                  <PreviewButton label="W+B" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="C+ES" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="F" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="W+D" color="text-purple-400" borderColor="border-zinc-800" />

                  {/* Row 5: Custom Mappable Buttons Row 3 (Copy, Paste, Select All, Cut) */}
                  <PreviewButton label="CPY" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="PST" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="ALL" color="text-purple-400" borderColor="border-zinc-800" />
                  <PreviewButton label="CUT" color="text-purple-400" borderColor="border-zinc-800" />
                </div>

                {/* Bottom Row: Quit, Theme, and Hide buttons */}
                <div className="flex gap-2 w-full mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#1a1a1a' }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-1 py-1.5 rounded-2xl bg-zinc-900 border border-red-500/50 text-red-500 text-[9px] font-bold uppercase tracking-wider"
                  >
                    Quit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#1a1a1a' }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-[1.5] py-1.5 rounded-2xl bg-zinc-900 border border-blue-500/50 text-blue-400 text-[9px] font-bold uppercase tracking-wider"
                  >
                    Theme
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#1a1a1a' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsExpanded(false)}
                    className="flex-1 py-1.5 rounded-2xl bg-zinc-900 border border-emerald-500/50 text-emerald-500 text-[9px] font-bold uppercase tracking-wider"
                  >
                    Hide
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Code Snippet Footer */}
      <footer className="max-w-6xl mx-auto px-6 pb-24">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-zinc-400">navpad.py</span>
            </div>
            <button onClick={handleCopy} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-bold">
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre className="p-8 text-sm font-mono text-zinc-400 overflow-x-auto leading-relaxed">
            {PYTHON_CODE}
          </pre>
        </div>
      </footer>
    </div>
  );
}

function PreviewButton({ icon, label, color, borderColor }: { icon?: React.ReactNode, label?: string, color: string, borderColor: string }) {
  const finalBorder = borderColor === 'border-zinc-800' ? 'border-transparent' : borderColor;
  return (
    <motion.div
      whileHover={{ scale: 1.05, backgroundColor: '#18181b' }}
      className={`aspect-square flex items-center justify-center rounded-[18px] bg-zinc-900 border ${finalBorder} ${color} shadow-lg cursor-pointer`}
    >
      {icon || <span className="text-[10px] font-bold">{label}</span>}
    </motion.div>
  );
}
