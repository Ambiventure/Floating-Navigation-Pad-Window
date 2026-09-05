import tkinter as tk
from tkinter import simpledialog
import pyautogui
pyautogui.PAUSE = 0.0
import time
import os
import ctypes
import sys
import json
import math

APP_NAME = "Floating NavPad"
APP_VERSION = "2.16"

# Configuration directory resolution
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
                flags |= 0x0001
            try:
                ctypes.windll.user32.keybd_event(vk, scan, flags, 0)
                return
            except:
                pass
    try:
        pyautogui.keyUp(key_str)
    except:
        pass

class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, radius, bg, fg, command=None, 
                 press_cmd=None, release_cmd=None, font=("Segoe UI", 10, "bold"), 
                 border_color="", active_bg="#444444", app=None, btn_id=None):
        super().__init__(parent, borderwidth=0, relief="flat", highlightthickness=0, bg=parent["bg"])
        self.command = command
        self.press_cmd = press_cmd
        self.release_cmd = release_cmd
        self.radius = radius
        self.btn_bg = bg
        self.btn_fg = fg
        self.active_bg = active_bg
        self.text = text
        self.font = font
        self.border_color = border_color
        self.app = app
        self.btn_id = btn_id
        
        self.drag_start_x = 0
        self.drag_start_y = 0
        self.has_dragged = False

        self.bind("<Configure>", self._on_resize)
        self.bind("<Button-1>", self.on_press)
        self.bind("<B1-Motion>", self.on_drag)
        self.bind("<ButtonRelease-1>", self.on_release)
        if self.app and hasattr(self.app, "on_btn_right_click"):
            self.bind("<Button-3>", lambda e: self.app.on_btn_right_click(e, self.btn_id))

    def _on_resize(self, event):
        self.draw()

    def set_text(self, new_text):
        self.text = new_text
        self.draw()

    def draw(self, is_pressed=False):
        self.delete("all")
        w = self.winfo_width()
        h = self.winfo_height()
        if w <= 1 or h <= 1:
            return

        r = self.radius
        # Clamp radius to avoid drawing glitches
        r = min(r, w // 2, h // 2)
        color = self.active_bg if is_pressed else self.btn_bg
        
        # Check if center button and in playing state
        center_playing = (self.btn_id == "center" and getattr(self.app, "is_playing", False))

        # Check if border is defined
        border = self.border_color if self.border_color else ""
        outline_args = {"outline": border, "width": 1} if border else {"outline": color}

        if r > 0:
            # Draw rounded rectangle using arcs and polygons
            self.create_arc((0, 0, 2 * r, 2 * r), start=90, extent=90, fill=color, **outline_args)
            self.create_arc((w - 2 * r, 0, w, 2 * r), start=0, extent=90, fill=color, **outline_args)
            self.create_arc((0, h - 2 * r, 2 * r, h), start=180, extent=90, fill=color, **outline_args)
            self.create_arc((w - 2 * r, h - 2 * r, w, h), start=270, extent=90, fill=color, **outline_args)

            self.create_rectangle((r, 0, w - r, h), fill=color, outline="")
            self.create_rectangle((0, r, w, h - r), fill=color, outline="")

            # Draw outer border lines manually if border is on
            if border:
                self.create_line((r, 0, w - r, 0), fill=border)
                self.create_line((r, h, w - r, h), fill=border)
                self.create_line((0, r, 0, h - r), fill=border)
                self.create_line((w, r, w, h - r), fill=border)
        else:
            self.create_rectangle((0, 0, w, h), fill=color, **outline_args)

        # Draw content
        if center_playing:
            # Draw Pause symbol: two vertical bars
            bar_w = max(2, int(w * 0.08))
            bar_h = max(6, int(h * 0.35))
            gap = max(3, int(w * 0.08))
            cx = w // 2
            cy = h // 2
            
            x1 = cx - gap // 2 - bar_w
            x2 = cx - gap // 2
            self.create_rectangle(x1, cy - bar_h // 2, x2, cy + bar_h // 2, fill=self.btn_fg, outline="")
            
            x3 = cx + gap // 2
            x4 = cx + gap // 2 + bar_w
            self.create_rectangle(x3, cy - bar_h // 2, x4, cy + bar_h // 2, fill=self.btn_fg, outline="")
        elif self.text in ["▲", "▼", "◀", "▶"]:
            cx, cy = w // 2, h // 2
            size = min(w, h) * 0.22
            if self.text == "▲":
                points = [cx, cy - size, cx - size, cy + size * 0.8, cx + size, cy + size * 0.8]
            elif self.text == "▼":
                points = [cx, cy + size, cx - size, cy - size * 0.8, cx + size, cy - size * 0.8]
            elif self.text == "◀":
                points = [cx - size, cy, cx + size * 0.8, cy - size, cx + size * 0.8, cy + size]
            elif self.text == "▶":
                points = [cx + size, cy, cx - size * 0.8, cy - size, cx - size * 0.8, cy + size]
            self.create_polygon(points, fill=self.btn_fg, outline="")
        elif self.text == "⏵⏸":
            cx, cy = w // 2, h // 2
            size = min(w, h) * 0.22
            points = [cx + size * 0.9, cy, cx - size * 0.7, cy - size, cx - size * 0.7, cy + size]
            self.create_polygon(points, fill=self.btn_fg, outline="")
        else:
            self.create_text((w // 2, h // 2), text=self.text, fill=self.btn_fg, font=self.font)

    def on_press(self, event):
        if self.app and self.app.edit_mode:
            self.drag_start_x = event.x
            self.drag_start_y = event.y
            self.has_dragged = False
            return

        self.draw(True)
        if self.press_cmd: 
            self.press_cmd()

    def on_drag(self, event):
        if self.app and self.app.edit_mode:
            self.has_dragged = True
            # Compute movement delta
            dx = event.x - self.drag_start_x
            dy = event.y - self.drag_start_y
            
            # Update coordinate in place
            new_x = self.winfo_x() + dx
            new_y = self.winfo_y() + dy
            self.place(x=new_x, y=new_y)
            
            # Record into button_positions
            if self.btn_id:
                self.app.button_positions[self.btn_id] = {"x": new_x, "y": new_y}
                self.app.layout_mode = "custom"

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
        self.win.title(f"NavPad Theme Engine v{APP_VERSION}")
        self.win.geometry("400x750")
        self.win.configure(bg="#1a1a1a")
        self.win.attributes('-topmost', True)
        self.win.focus_force()

        tk.Label(self.win, text=f"THEME ENGINE v{APP_VERSION}", bg="#1a1a1a", fg="white", font=("Segoe UI", 16, "bold")).pack(pady=10)
        
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

        # Scroll Wheel bindings
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
        self.create_slider(props_frame, "Inner Button Radius", "min_btn_radius", 0, 24)
        self.create_slider(props_frame, "Padding Inside Bubble", "min_padding", 2, 20)
        self.create_color_row(props_frame, "Bubble Background", "min_bg")
        self.create_color_row(props_frame, "Bubble Border Color", "min_border_color")
        self.create_color_row(props_frame, "Bubble Icons/Text", "min_fg")

        self.create_section(props_frame, "ROW ACCENT COLORS")
        self.create_color_row(props_frame, "Zoom/Alpha (-)", "row_color_0")
        self.create_color_row(props_frame, "Arrows (▲▼◀▶)", "row_color_1")
        self.create_color_row(props_frame, "Zoom/Alpha (+)", "row_color_2")
        self.create_color_row(props_frame, "Custom Rows (C1-C12)", "row_color_custom")

        # Bottom Buttons
        btn_frame = tk.Frame(self.win, bg="#1a1a1a")
        btn_frame.pack(side="bottom", fill="x", pady=15, padx=20)
        
        reset_layout_btn = tk.Button(btn_frame, text="Reset Positions", bg="#ff4444", fg="white", 
                                     font=("Segoe UI", 9, "bold"), relief="flat", command=self.reset_layout)
        reset_layout_btn.pack(side="left", fill="x", expand=True, padx=5)

        reset_colors_btn = tk.Button(btn_frame, text="Reset Defaults", bg="#333333", fg="white", 
                                     font=("Segoe UI", 9, "bold"), relief="flat", command=self.reset_all_defaults)
        reset_colors_btn.pack(side="right", fill="x", expand=True, padx=5)

    def create_section(self, parent, title):
        lbl = tk.Label(parent, text=title, bg="#1a1a1a", fg="#888888", font=("Segoe UI", 9, "bold"))
        lbl.pack(anchor="w", padx=20, pady=(15, 5))

    def create_slider(self, parent, label, key, min_v, max_v):
        frame = tk.Frame(parent, bg="#1a1a1a")
        frame.pack(fill="x", padx=20, pady=2)
        tk.Label(frame, text=label, bg="#1a1a1a", fg="white", font=("Segoe UI", 9)).pack(side="left")
        
        val = self.navpad.theme.get(key, min_v)
        scale = tk.Scale(frame, from_=min_v, to=max_v, orient="horizontal", bg="#1a1a1a", 
                         fg="white", highlightthickness=0, bd=0, length=150)
        scale.set(val)
        scale.pack(side="right")
        scale.bind("<ButtonRelease-1>", lambda e: self.update_theme(key, scale.get()))

    def create_toggle(self, parent, label, attr):
        frame = tk.Frame(parent, bg="#1a1a1a")
        frame.pack(fill="x", padx=20, pady=5)
        tk.Label(frame, text=label, bg="#1a1a1a", fg="white", font=("Segoe UI", 9)).pack(side="left")
        
        is_on = getattr(self.navpad, attr, False)
        btn = tk.Button(frame, text="ON" if is_on else "OFF", bg="#00aa44" if is_on else "#444444", 
                        fg="white", relief="flat", width=6)
        btn.pack(side="right")
        
        def toggle():
            new_val = not getattr(self.navpad, attr, False)
            setattr(self.navpad, attr, new_val)
            btn.config(text="ON" if new_val else "OFF", bg="#00aa44" if new_val else "#444444")
            self.navpad.save_settings()
            self.navpad.setup_ui()
            
        btn.config(command=toggle)

    def create_option_menu(self, parent, label, key, options):
        frame = tk.Frame(parent, bg="#1a1a1a")
        frame.pack(fill="x", padx=20, pady=4)
        tk.Label(frame, text=label, bg="#1a1a1a", fg="white", font=("Segoe UI", 9)).pack(side="left")
        
        var = tk.StringVar(value=self.navpad.theme.get(key, options[0]))
        menu = tk.OptionMenu(frame, var, *options, command=lambda v: self.update_theme(key, v))
        menu.config(bg="#333333", fg="white", relief="flat", highlightthickness=0)
        menu.pack(side="right")

    def create_color_row(self, parent, label, key):
        frame = tk.Frame(parent, bg="#1a1a1a")
        frame.pack(fill="x", padx=20, pady=3)
        tk.Label(frame, text=label, bg="#1a1a1a", fg="white", font=("Segoe UI", 9)).pack(side="left")
        
        color_val = self.navpad.theme.get(key, "")
        
        btn = tk.Button(frame, text="None" if not color_val else " ", bg=color_val if color_val else "#1a1a1a",
                        fg="white", relief="solid", bd=1, width=4)
        btn.pack(side="right")
        
        def pick():
            c = simpledialog.askstring("Color", f"Enter Hex color for {label} (e.g. #ff0000) or 'none':", 
                                       initialvalue=color_val, parent=self.win)
            if c is not None:
                c = c.strip()
                if c.lower() in ["none", "", "transparent"]:
                    self.update_theme(key, "")
                    btn.config(text="None", bg="#1a1a1a")
                elif c.startswith("#") and (len(c) == 7 or len(c) == 4):
                    self.update_theme(key, c)
                    btn.config(text=" ", bg=c)
        
        btn.config(command=pick)

    def update_theme(self, key, val):
        self.navpad.theme[key] = val
        self.navpad.save_settings()
        self.navpad.setup_ui()
        if not self.navpad.is_expanded:
            self.navpad.draw_min_mode()

    def reset_layout(self):
        self.navpad.button_positions = {}
        self.navpad.layout_mode = "grid"
        self.navpad.edit_mode = False
        self.apply_and_refresh()

    def reset_all_defaults(self):
        self.navpad.theme = {
            "radius": 16, "btn_bg": "#1a1a1a", "btn_active_bg": "#444444", "btn_fg": "#ffffff",
            "btn_border": "", "pad_bg": "#121212", "pad_border": "#333333", "btn_scale": 75,
            "dot_radius": 10, "dot_fg": "#ffffff", "dot_bg": "#1a1a1a", "dot_border": "#333333",
            "row_color_0": "#ff4444", "row_color_1": "#00ff88", "row_color_2": "#44aaff",
            "row_color_custom": "#cc88ff", "min_shape": "squircle", "min_bg": "#1a1a1a",
            "min_border_color": "#333333", "min_border_width": 1, "min_radius": 16,
            "min_fg": "#ffffff", "min_btn_radius": 8, "min_padding": 6
        }
        self.navpad.mappings = {
            "up": "up", "down": "down", "left": "left", "right": "right",
            "center": "space", "vol_up": "backspace", "vol_down": "alt+s", "mute": "enter",
            "c1": "printscreen", "c2": "esc", "c3": "win+alt", "c4": "alt+shift+s",
            "c5": "win+ctrl+shift+b", "c6": "ctrl+esc", "c7": "f", "c8": "win+d",
            "c9": "ctrl+c", "c10": "ctrl+v", "c11": "ctrl+a", "c12": "ctrl+x"
        }
        self.navpad.button_positions = {}
        self.navpad.layout_mode = "grid"
        self.navpad.edit_mode = False
        self.apply_and_refresh()
        
    def apply_and_refresh(self):
        self.navpad.save_settings()
        self.navpad.setup_ui()
        self.win.destroy()
        self.navpad.open_theme()

class FloatingNavPad:
    def __init__(self, root):
        self.root = root
        self.root.title(f"NavPad Pro v{APP_VERSION}")
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
        
        # Default mappings (Column 4: Backspace, Enter, Alt+S, Alt+Shift+S)
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
            
            # Minimized bubble properties
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
        
        self.root.overrideredirect(True)
        self.root.attributes('-topmost', True)
        self.root.attributes('-alpha', self.alpha)
        
        # Make window non-activatable so it doesn't steal focus from video players
        self.set_no_focus()
        
        # Periodic topmost enforcement watchdog to prevent losing PiP status when Chrome menus or other overlays open
        self.enforce_topmost_loop()
        
        self.setup_ui()
        self.update_geometry()
        
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
        try:
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    self.zoom = data.get("zoom", self.zoom)
                    self.alpha = data.get("alpha", self.alpha)
                    self.theme.update(data.get("theme", {}))
                    self.mappings.update(data.get("mappings", {}))
                    self.button_positions = data.get("button_positions", {})
                    self.layout_mode = data.get("layout_mode", "grid")
                    self.edit_mode = data.get("edit_mode", False)
        except:
            pass
            
        for k, v in defaults.items():
            if k not in self.mappings:
                self.mappings[k] = v

    def on_btn_right_click(self, event, btn_id):
        if not btn_id: return
        menu = tk.Menu(self.root, tearoff=0, bg="#222222", fg="white", activebackground="#444444", activeforeground="white")
        
        presets = [
            ("1. Screenshot (Print Screen)", "printscreen"),
            ("2. Escape (ESC)", "esc"),
            ("3. Windows + Alt (Win+Alt)", "win+alt"),
            ("4. Alt + Shift + S", "alt+shift+s"),
            ("5. Reset GPU (Win+Ctrl+Shift+B)", "win+ctrl+shift+b"),
            ("6. Start / Task (Ctrl+Esc)", "ctrl+esc"),
            ("7. Key: F (Fullscreen Toggle)", "f"),
            ("8. Minimize All (Win+D)", "win+d"),
            ("Backspace", "backspace"),
            ("Enter", "enter"),
            ("Alt + S", "alt+s"),
            ("Fullscreen (F11)", "f11"),
            ("Copy (Ctrl+C)", "ctrl+c"),
            ("Paste (Ctrl+V)", "ctrl+v"),
            ("Select All (Ctrl+A)", "ctrl+a"),
            ("Cut (Ctrl+X)", "ctrl+x"),
            ("Task Manager (Ctrl+Shift+Esc)", "ctrl+shift+esc"),
            ("Alt + F4 (Close)", "alt+f4"),
            ("Alt + Tab", "alt+tab"),
            ("Volume Up", "volumeup"),
            ("Volume Mute", "volumemute"),
            ("Volume Down", "volumedown"),
            ("Media Next", "nexttrack"),
            ("Media Prev", "prevtrack"),
            ("Key: D", "d")
        ]
        
        current_val = self.mappings.get(btn_id, "").lower()
        
        for name, val in presets:
            prefix = "✓ " if current_val == val.lower() else "   "
            menu.add_command(label=f"{prefix}{name}", command=lambda v=val: self.set_shortcut(btn_id, v))
            
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

    def edit_shortcut(self, btn_id):
        curr = self.mappings.get(btn_id, "")
        val = simpledialog.askstring("Custom Shortcut", 
                                     f"Enter shortcut for {btn_id.upper()} (e.g. ctrl+shift+esc, f5, alt+tab):", 
                                     initialvalue=curr, parent=self.root)
        if val is not None:
            val = val.strip().lower()
            if val:
                self.set_shortcut(btn_id, val)

    def save_settings(self):
        data = {
            "zoom": self.zoom,
            "alpha": self.alpha,
            "theme": self.theme,
            "mappings": self.mappings,
            "button_positions": self.button_positions,
            "layout_mode": self.layout_mode,
            "edit_mode": self.edit_mode,
            "version": APP_VERSION
        }
        try:
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
        if not self.is_expanded:
            dot_rad = self.theme.get("dot_radius", 10)
            btn_size = int(dot_rad * 4 * self.zoom)
            padding = int(self.theme.get("min_padding", 6) * self.zoom)
            gap = int(4 * self.zoom)
            w = padding * 2 + 4 * btn_size + 3 * gap
            h = padding * 2 + btn_size
        else:
            base_w = int(240 * self.zoom)
            base_h = int(390 * self.zoom)
            w = base_w
            h = base_h

        curr_x = self.root.winfo_x()
        curr_y = self.root.winfo_y()
        self.root.geometry(f"{w}x{h}+{curr_x}+{curr_y}")

    def toggle_expand(self):
        self.is_expanded = not self.is_expanded
        self.setup_ui()
        self.update_geometry()

    def open_theme(self):
        if self.theme_window and self.theme_window.win.winfo_exists():
            self.theme_window.win.lift()
            return
        self.theme_window = ThemeWindow(self)

    def get_custom_label(self, btn_id):
        key = self.mappings.get(btn_id, "").lower()
        if not key: return btn_id.upper()
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
        
        # Format combo labels nicely
        if "+" in key:
            parts = key.split("+")
            short_parts = []
            for p in parts:
                p = p.strip()
                if p == "ctrl": short_parts.append("C")
                elif p == "alt": short_parts.append("A")
                elif p == "shift": short_parts.append("S")
                elif p == "win": short_parts.append("W")
                else: short_parts.append(p.upper()[:2])
            return "+".join(short_parts)[:5]
            
        return key.upper()[:4]

    def add_btn(self, parent, text, r, c, color, mapping, cmd=None, btn_id=None):
        btn_scale = self.theme.get("btn_scale", 75)
        raw_size = int(btn_scale * 0.52 * self.zoom)
        btn_size = max(18, raw_size)
        
        font_size = max(6, int(10 * (btn_size / 40)))
        radius = int(self.theme.get("radius", 16) * (btn_size / 40))

        # Check for user defined button color
        bg = self.theme.get("btn_bg", "#1a1a1a")
        active_bg = self.theme.get("btn_active_bg", "#444444")
        border = self.theme.get("btn_border", "")
        
        if cmd:
            btn = RoundedButton(parent, text=text, radius=radius, bg=bg, fg=color, command=cmd, 
                                font=("Segoe UI", font_size, "bold"), border_color=border, 
                                active_bg=active_bg, app=self, btn_id=btn_id)
        else:
            btn = RoundedButton(parent, text=text, radius=radius, bg=bg, fg=color, 
                                press_cmd=lambda: self.trigger_down(mapping), 
                                release_cmd=lambda: self.trigger_up(mapping), 
                                font=("Segoe UI", font_size, "bold"), border_color=border, 
                                active_bg=active_bg, app=self, btn_id=btn_id)
            
        if self.layout_mode == "custom" and btn_id in self.button_positions:
            pos = self.button_positions[btn_id]
            btn.place(x=pos["x"], y=pos["y"], width=btn_size, height=btn_size)
        else:
            btn.grid(row=r, column=c, padx=int(2*self.zoom), pady=int(2*self.zoom), sticky="nsew")

    def setup_ui(self):
        for widget in self.root.winfo_children():
            widget.destroy()

        if not self.is_expanded:
            # Assistive-Touch Style Minimized Bubble
            self.root.configure(bg=self.theme.get("pad_bg", "#121212"))
            
            self.min_canvas = tk.Canvas(self.root, bg=self.theme.get("pad_bg", "#121212"), highlightthickness=0)
            self.min_canvas.pack(fill="both", expand=True)
            
            self.min_canvas.bind("<Button-1>", self.on_min_press)
            self.min_canvas.bind("<B1-Motion>", self.on_min_drag)
            self.min_canvas.bind("<ButtonRelease-1>", self.on_min_release)
            self.min_canvas.bind("<Configure>", lambda e: self.draw_min_mode())
            
            self.draw_min_mode()
        else:
            # Expanded Mode: Obsidian Matte Pad
            pad_bg = self.theme.get("pad_bg", "#121212")
            pad_border = self.theme.get("pad_border", "#333333")
            
            self.root.configure(bg=pad_border)
            
            pad_radius = int(self.theme.get("radius", 16) * 1.5 * self.zoom)
            
            content_parent = tk.Frame(self.root, bg=pad_bg)
            content_parent.pack(fill="both", expand=True, padx=1, pady=1)

            for i in range(4): content_parent.grid_columnconfigure(i, weight=1)
            for i in range(7): content_parent.grid_rowconfigure(i, weight=1)

            # Pad Grid Definition
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
                        current_mapped = self.mappings.get(key)
                        orig_mapped = default_key_mappings.get(key)
                        if current_mapped != orig_mapped:
                            text = self.get_custom_label(key)
                self.add_btn(content_parent, text, r, c, color, mapping, cmd, btn_id=key)

            # Footer buttons
            btn_f_font = ("Segoe UI", max(6, int(8 * self.zoom)), "bold")
            f_r = int(self.theme.get("radius", 16) * 0.7 * self.zoom)
            
            btn_quit = RoundedButton(content_parent, text="QUIT", radius=f_r, bg="#1a1a1a", fg="#ff4444", 
                                     command=self.root.destroy, font=btn_f_font, border_color="#552222", 
                                     app=self, btn_id="quit")
            btn_theme = RoundedButton(content_parent, text="THEME", radius=f_r, bg="#1a1a1a", fg="#44aaff", 
                                      command=self.open_theme, font=btn_f_font, border_color="#224455", 
                                      app=self, btn_id="theme")
            btn_hide = RoundedButton(content_parent, text="HIDE", radius=f_r, bg="#1a1a1a", fg="#00ff88", 
                                     command=self.toggle_expand, font=btn_f_font, border_color="#225533", 
                                     app=self, btn_id="hide")

            if self.layout_mode == "custom" and "quit" in self.button_positions:
                pos = self.button_positions["quit"]
                btn_quit.place(x=pos["x"], y=pos["y"], width=int(50*self.zoom), height=int(24*self.zoom))
            else:
                btn_quit.grid(row=6, column=0, padx=int(2*self.zoom), pady=int(4*self.zoom), sticky="nsew")

            if self.layout_mode == "custom" and "theme" in self.button_positions:
                pos = self.button_positions["theme"]
                btn_theme.place(x=pos["x"], y=pos["y"], width=int(90*self.zoom), height=int(24*self.zoom))
            else:
                btn_theme.grid(row=6, column=1, columnspan=2, padx=int(2*self.zoom), pady=int(4*self.zoom), sticky="nsew")

            if self.layout_mode == "custom" and "hide" in self.button_positions:
                pos = self.button_positions["hide"]
                btn_hide.place(x=pos["x"], y=pos["y"], width=int(50*self.zoom), height=int(24*self.zoom))
            else:
                btn_hide.grid(row=6, column=3, padx=int(2*self.zoom), pady=int(4*self.zoom), sticky="nsew")

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
        self.offset_x = event.x_root - self.root.winfo_x()
        self.offset_y = event.y_root - self.root.winfo_y()
        self.moved = False

    def do_move(self, event):
        x = event.x_root - self.offset_x
        y = event.y_root - self.offset_y
        
        if not self.moved:
            curr_x = self.root.winfo_x()
            curr_y = self.root.winfo_y()
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
        
        w = self.min_canvas.winfo_width()
        h = self.min_canvas.winfo_height()
        if w <= 1 or h <= 1:
            dot_rad = self.theme.get("dot_radius", 10)
            btn_size = int(dot_rad * 4 * self.zoom)
            padding = int(self.theme.get("min_padding", 6) * self.zoom)
            gap = int(4 * self.zoom)
            w = padding * 2 + 4 * btn_size + 3 * gap
            h = padding * 2 + btn_size

        min_shape = self.theme.get("min_shape", "squircle")
        min_bg = self.theme.get("min_bg", "#1a1a1a")
        min_border_col = self.theme.get("min_border_color", "#333333")
        min_border_w = self.theme.get("min_border_width", 1)
        min_r = int(self.theme.get("min_radius", 16) * self.zoom)
        min_fg = self.theme.get("min_fg", "#ffffff")
        min_btn_r = int(self.theme.get("min_btn_radius", 8) * self.zoom)
        padding = int(self.theme.get("min_padding", 6) * self.zoom)
        gap = int(4 * self.zoom)

        # 1. Draw Container Background
        border_args = {"outline": min_border_col, "width": min_border_w} if min_border_w > 0 else {"outline": min_bg}

        if min_shape == "circle":
            min_r = min(w, h) // 2
            self.min_canvas.create_oval(0, 0, w, h, fill=min_bg, **border_args)
        elif min_shape == "squircle" and min_r > 0:
            r = min(min_r, w // 2, h // 2)
            self.min_canvas.create_arc((0, 0, 2 * r, 2 * r), start=90, extent=90, fill=min_bg, **border_args)
            self.min_canvas.create_arc((w - 2 * r, 0, w, 2 * r), start=0, extent=90, fill=min_bg, **border_args)
            self.min_canvas.create_arc((0, h - 2 * r, 2 * r, h), start=180, extent=90, fill=min_bg, **border_args)
            self.min_canvas.create_arc((w - 2 * r, h - 2 * r, w, h), start=270, extent=90, fill=min_bg, **border_args)
            self.min_canvas.create_rectangle((r, 0, w - r, h), fill=min_bg, outline="")
            self.min_canvas.create_rectangle((0, r, w, h - r), fill=min_bg, outline="")
            if min_border_w > 0:
                self.min_canvas.create_line((r, 0, w - r, 0), fill=min_border_col, width=min_border_w)
                self.min_canvas.create_line((r, h, w - r, h), fill=min_border_col, width=min_border_w)
                self.min_canvas.create_line((0, r, 0, h - r), fill=min_border_col, width=min_border_w)
                self.min_canvas.create_line((w, r, w, h - r), fill=min_border_col, width=min_border_w)
        else:
            self.min_canvas.create_rectangle(0, 0, w, h, fill=min_bg, **border_args)

        # 2. Draw 4 Buttons
        dot_rad = self.theme.get("dot_radius", 10)
        btn_size = int(dot_rad * 4 * self.zoom)

        for i in range(4):
            bx1 = padding + i * (btn_size + gap)
            by1 = padding
            bx2 = bx1 + btn_size
            by2 = by1 + btn_size

            is_pressed = (hasattr(self, "pressed_btn") and self.pressed_btn == i)
            btn_bg_col = self.theme.get("btn_active_bg", "#444444") if is_pressed else min_bg
            
            # Button Substrate
            if min_btn_r > 0:
                br = min(min_btn_r, btn_size // 2)
                self.min_canvas.create_arc((bx1, by1, bx1 + 2 * br, by1 + 2 * br), start=90, extent=90, fill=btn_bg_col, outline="")
                self.min_canvas.create_arc((bx2 - 2 * br, by1, bx2, by1 + 2 * br), start=0, extent=90, fill=btn_bg_col, outline="")
                self.min_canvas.create_arc((bx1, by2 - 2 * br, bx1 + 2 * br, by2), start=180, extent=90, fill=btn_bg_col, outline="")
                self.min_canvas.create_arc((bx2 - 2 * br, by2 - 2 * br, bx2, by2), start=270, extent=90, fill=btn_bg_col, outline="")
                self.min_canvas.create_rectangle((bx1 + br, by1, bx2 - br, by2), fill=btn_bg_col, outline="")
                self.min_canvas.create_rectangle((bx1, by1 + br, bx2, by2 - br), fill=btn_bg_col, outline="")
            else:
                self.min_canvas.create_rectangle(bx1, by1, bx2, by2, fill=btn_bg_col, outline="")

            # Button Glyph
            cx = (bx1 + bx2) // 2
            cy = (by1 + by2) // 2
            m = int(btn_size * 0.28)

            if i == 0:
                # White dot (Expand Trigger)
                r_dot = max(2, int(btn_size * 0.16))
                self.min_canvas.create_oval(cx - r_dot, cy - r_dot, cx + r_dot, cy + r_dot, fill=min_fg, outline="")
            elif i == 1:
                # Left arrow (◀)
                x_left = cx - (btn_size // 2) + m
                x_right = cx + (btn_size // 2) - m
                y_top = cy - (btn_size // 2) + m
                y_bottom = cy + (btn_size // 2) - m
                self.min_canvas.create_polygon(x_left, cy, x_right, y_top, x_right, y_bottom, fill=min_fg, outline=min_fg, width=1)
            elif i == 2:
                # Play/Pause Toggle
                if self.is_playing:
                    # Draw Pause bars
                    bar_w = max(2, int(btn_size * 0.1))
                    bar_h = int(btn_size * 0.42)
                    gap_bar = max(3, int(btn_size * 0.12))
                    self.min_canvas.create_rectangle(cx - gap_bar//2 - bar_w, cy - bar_h//2, cx - gap_bar//2, cy + bar_h//2, fill=min_fg, outline="")
                    self.min_canvas.create_rectangle(cx + gap_bar//2, cy - bar_h//2, cx + gap_bar//2 + bar_w, cy + bar_h//2, fill=min_fg, outline="")
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
    root.mainloop()
