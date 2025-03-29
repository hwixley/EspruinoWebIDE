/**
 Copyright 2014 Gordon Williams (gw@pur3.co.uk)

 This Source Code is subject to the terms of the Mozilla Public
 License, v2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.

 ------------------------------------------------------------------
  CodeMirror JavaScript editor
 ------------------------------------------------------------------
**/
"use strict";
(function(){
  var editors = [];
  var id = 0; // auto-incrementing ID used for codeMirror elements
  var defaultLintFlags = { // https://jshint.com/docs/options/
    esversion   : 6,    // Enable ES6 for literals, arrow fns, binary
    evil        : true, // don't warn on use of strings in setInterval
    laxbreak    : true,  // don't warn about newlines in expressions
    laxcomma    : true  // don't warn about commas at the start of the line
  };

  function init() {
    // Options
    Espruino.Core.Config.add("KEYMAP", {
      section : "General",
      name : "JavaScript Editor Keymap",
      description : "Changes the keymap for the JavaScript editor.",
      type : { "emacs": "Emacs", "vim": "Vim", "sublime": "Sublime" },
      defaultValue : "sublime",
      onChange : function(newValue) {
        for (const ed of Espruino.Core.EditorJavaScript.getEditors()) {
          ed.codeMirror.setOption('keyMap', Espruino.Config.KEYMAP);
        }
      }
    });
    Espruino.Core.Config.add("THEME", {
      section : "General",
      name : "JavaScript Editor Theme",
      description : "Changes the colour scheme for the JavaScript editor.",
      type : { "default": "default", "3024-day": "3024-day", "3024-night": "3024-night", "abcdef": "abcdef", "ambiance": "ambiance", "ayu-dark": "ayu-dark", "ayu-mirage": "ayu-mirage", "base16-dark": "base16-dark", "base16-light": "base16-light", "bespin": "bespin", "blackboard": "blackboard", "cobalt": "cobalt", "colorforth": "colorforth", "darcula": "darcula", "dracula": "dracula", "duotone-dark": "duotone-dark", "duotone-light": "duotone-light", "eclipse": "eclipse", "elegant": "elegant", "espruino": "espruino", "erlang-dark": "erlang-dark", "gruvbox-dark": "gruvbox-dark", "hopscotch": "hopscotch", "icecoder": "icecoder", "idea": "idea", "isotope": "isotope", "lesser-dark": "lesser-dark", "liquibyte": "liquibyte", "lucario": "lucario", "material": "material", "material-darker": "material-darker", "material-palenight": "material-palenight", "material-ocean": "material-ocean", "mbo": "mbo", "mdn-like": "mdn-like", "midnight": "midnight", "monokai": "monokai", "moxer": "moxer", "neat": "neat", "neo": "neo", "night": "night", "nord": "nord", "oceanic-next": "oceanic-next", "panda-syntax": "panda-syntax", "paraiso-dark": "paraiso-dark", "paraiso-light": "paraiso-light", "pastel-on-dark": "pastel-on-dark", "railscasts": "railscasts", "rubyblue": "rubyblue", "seti": "seti", "shadowfox": "shadowfox", "solarized dark": "solarized dark", "solarized light": "solarized light", "the-matrix": "the-matrix", "tomorrow-night-bright": "tomorrow-night-bright", "tomorrow-night-eighties": "tomorrow-night-eighties", "ttcn": "ttcn", "twilight": "twilight", "vibrant-ink": "vibrant-ink", "xq-dark": "xq-dark", "xq-light": "xq-light", "yeti": "yeti", "yonce": "yonce", "zenburn": "zenburn" },
      defaultValue : "default",
      onChange : function(newValue) {
        loadThemeCSS(Espruino.Config.THEME);
        for (const ed of Espruino.Core.EditorJavaScript.getEditors()) {
          ed.codeMirror.setOption('theme', Espruino.Config.THEME);
        }
      }
    });
    Espruino.Core.Config.add("INDENTATION_TYPE", {
      section : "General",
      name : "Indentation Type",
      description : "Whether to indent using spaces or tab characters",
      type : { "spaces": "Spaces", "tabs": "Tabs" },
      defaultValue : "spaces",
      onChange : function(newValue) {
        for (const ed of Espruino.Core.EditorJavaScript.getEditors()) {
          ed.codeMirror.setOption('indentWithTabs', !!(Espruino.Config.INDENTATION_TYPE == "tabs"));
        }
      }
    });
    Espruino.Core.Config.add("TAB_SIZE", {
      section : "General",
      name : "Indentation Size",
      description : "The number of space characters an indentation should take up",
      type : {1:1,2:2,4:4,8:8},
      defaultValue : 2,
      onChange : function(newValue) {
        for (const ed of Espruino.Core.EditorJavaScript.getEditors()) {
          ed.codeMirror.setOption('tabSize', Number(Espruino.Config.TAB_SIZE));
          ed.codeMirror.setOption('indentUnit', Number(Espruino.Config.TAB_SIZE));
        }
      }
    });
    Espruino.Core.Config.add("DISABLE_CODE_HINTS", {
      section : "General",
      name : "Disable Code Hints",
      description : "Disable code hints in the editor. BE CAREFUL - they're there "+
      "for a reason. If your code is creating warnings then it may well not work "+
      "on Espruino! (needs a restart to take effect)",
      type : "boolean",
      defaultValue : false,
      onChange: function(newValue) {
        for (const ed of Espruino.Core.EditorJavaScript.getEditors()) {
          ed.codeMirror.setOption('lint', (Espruino.Config.DISABLE_CODE_HINTS) ? false : defaultLintFlags);
        }
      }
    });
    CodeMirror.defineExtension('beautify', function () {
      if (js_beautify) {
        var cm = this;
        cm.setValue(js_beautify(cm.getValue(), {
          indent_size: Number(Espruino.Config.TAB_SIZE),
        }));
      }
    });
    loadThemeCSS(Espruino.Config.THEME);
  }

  /* Returns:
  {
    id : string // id of the code element
    textarea : DOM element of textarea
    div : DOM element of outer div
    codeMirror : codemirror instance
    visible : bool
    remove : function to remove
    setVisible : function(bool)
    setCode
  }
  */
  function createNewEditor() {
    var editor = {
      id : "code" + (id++),
      visible : true
    };

    $(`<div id="div${editor.id}" style="width:100%;height:100%;"><textarea id="${editor.id}"></textarea></div>`).appendTo(".editor--code .editor__canvas");
    // The code editor
    editor.textarea = document.getElementById(editor.id);
    editor.div = document.getElementById("div"+editor.id);
    editor.codeMirror = CodeMirror.fromTextArea(editor.textarea, {
      width: "100%",
      height: "100%",
      lineNumbers: true,
      matchBrackets: true,
      mode: {name: "javascript", globalVars: false},
      lineWrapping: true,
      showTrailingSpace: true,
      lint: ((Espruino.Config.DISABLE_CODE_HINTS) ? false : defaultLintFlags),
      highlightSelectionMatches: {showToken: /\w/},
      foldGutter: {rangeFinder: new CodeMirror.fold.combine(CodeMirror.fold.brace, CodeMirror.fold.comment, CodeMirror.fold.indent)},
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"],
      keyMap: Espruino.Config.KEYMAP,
      theme: Espruino.Config.THEME,
      indentWithTabs: !!(Espruino.Config.INDENTATION_TYPE == "tabs"),
      tabSize: Number(Espruino.Config.TAB_SIZE),
      indentUnit: Number(Espruino.Config.TAB_SIZE),
      extraKeys: {
        "Tab" : function(cm) {
          if (cm.somethingSelected()) {
            // `cm.indentSelection("add");` has been replaced due to issues when
            // indenting using 4 spaces rather than 2. Instead, this for loop
            // will iterate each line and indent that line. For lines where
            // there's spaces that don't match an indentation level, the line
            // will be snapped to the next tab stop.
            // Also works with indentations that use the tab character!
            for (var line = cm.getCursor(true).line; line <= cm.getCursor(false).line; line++) {
              var spacesAlreadyIndented = cm.getLine(line).search(/\S|\t|$/) % cm.getOption("indentUnit");

              cm.indentLine(line, cm.getOption("indentUnit") - spacesAlreadyIndented);
            }
          } else { // make sure the tab key indents with spaces
            cm.replaceSelection(cm.getOption("indentWithTabs")? "\t":
              " ".repeat(cm.getOption("indentUnit")), "end", "+input");
          }
        },
        "Ctrl-B": function(cm) {
          cm.beautify();
        }
      }
    });
    // When things have changed...
    editor.codeMirror.on("change", function(cm, changeObj) {
      // If pasting, make sure text gets pasted in the right format
      if (changeObj.origin == "paste") {
        var c = cm.getCursor();
        var code = cm.getValue();
        var newcode = Espruino.Core.Utils.fixBrokenCode(code);
        if (newcode!=code) {
          // Only set if code has changed, as it moves the scrollbar location :(
          cm.setValue(newcode);
          cm.setCursor(c);
        }
      }
      // Send an event for code changed
      Espruino.callProcessor("jsCodeChanged", { code : cm.getValue(), editor : editor } );
    });
    // Handle hovering
    CodeMirror.on(editor.codeMirror.getWrapperElement(), "mouseover", function(e) {
      var node = e.target || e.srcElement;
      if (node) {
        var stillInNode = true;
        CodeMirror.on(node, "mouseout", function mo() {
          CodeMirror.off(node, "mouseout", mo);
          stillInNode = false;
        });
        Espruino.callProcessor("editorHover", {
          node : node,
          showTooltip : function(htmlNode) {
            if (stillInNode) showTooltipFor(e, htmlNode, node);
          }
        });
      }
    });
    CodeMirror.on(editor.codeMirror.getWrapperElement(), "mouseout", function(e) {
      var tooltips = document.getElementsByClassName('CodeMirror-Tern-tooltip');
        while(tooltips.length)
          tooltips[0].parentNode.removeChild(tooltips[0]);
    });
    if (Espruino.Plugins.Tern)
      Espruino.Plugins.Tern.applyToEditor(editor);

    // Add extra functions to return object
    editor.remove = function() {
      editor.HAS_BEEN_REMOVED = true;
      editor.codeMirror.toTextArea();
      editor.div.remove();
      var idx = editors.indexOf(editor);
      editors.splice(idx, idx !== -1 ? 1 : 0);
    };
    editor.setVisible = function(isVisible) {
      editor.visible = isVisible;
      if (isVisible) {
        editors.forEach(e => {
          if (e!=editor) {
            $(e.div).hide();
            e.visible = false;
          }
        });
        $(editor.div).show();
        setTimeout(function () {
          editor.codeMirror.refresh();
        }, 1);
      } else
        $(editor.div).hide();
    };
    editor.setCode = function(code) {
      editor.codeMirror.setValue(code);
    };
    editor.getCode = function() {
      var code = editor.codeMirror.getValue();
      // replace the Non-breaking space character with space. This seems to be an odd Android thing
      return code.replace(/\xA0/g," ");
    };
    editor.getSelectedCode = function() {
      var code = editor.codeMirror.getSelection();
      // replace the Non-breaking space character with space. This seems to be an odd Android thing
      return code.replace(/\xA0/g," ");
    };
    editors.push(editor);
    return editor;
  }

  function getVisibleEditor() {
    return editors.find(cm => cm.visible);
  }

  function loadThemeCSS(selectedTheme) {
    var codeMirrorMainCSS = document.querySelector('link[href$="codemirror.css"]');
    if (codeMirrorMainCSS===null) // for when serving up file-compacted IDE
      codeMirrorMainCSS = document.querySelector('link[href="index.css"]');
    var codeMirrorThemeCSS = document.querySelector('link[href^="js/libs/codemirror/theme/"]');

    // default theme css lives in main css and doesn't need an extra sheet loaded
    if (selectedTheme === 'default') {
      if (codeMirrorThemeCSS) {
        codeMirrorThemeCSS.remove(); // remove previous theme css sheet
      }
    }else{
      selectedTheme = selectedTheme.replace(/solarized\s(dark|light)/, 'solarized'); // edge case for solarized theme: 1 sheet for both themes

      var newThemeCSS = 'js/libs/codemirror/theme/' + selectedTheme + '.css';

      if (!codeMirrorThemeCSS) {
        codeMirrorThemeCSS = document.createElement('link');
        codeMirrorThemeCSS.href = newThemeCSS;
        codeMirrorThemeCSS.setAttribute('rel', 'stylesheet');

        if (codeMirrorMainCSS) {
          codeMirrorMainCSS.parentNode.insertBefore(codeMirrorThemeCSS, codeMirrorMainCSS.nextSibling);
        }

      } else if (newThemeCSS !== codeMirrorThemeCSS.href) {
        codeMirrorThemeCSS.href = newThemeCSS;
      }
    }
  }

  // --------------------------------------------------------------------------
  // Stolen from codemirror's lint.js (not exported :( )
  // --------------------------------------------------------------------------

  function showTooltip(e, content) {
    var tt = document.createElement("div");
    tt.className = "CodeMirror-lint-tooltip";
    tt.appendChild(content.cloneNode(true));
    document.body.appendChild(tt);

    function position(e) {
      if (!tt.parentNode) return CodeMirror.off(document, "mousemove", position);
      tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + "px";
      tt.style.left = (e.clientX + 5) + "px";
    }
    CodeMirror.on(document, "mousemove", position);
    position(e);
    if (tt.style.opacity != null) tt.style.opacity = 1;
    return tt;
  }
  function rm(elt) {
    if (elt.parentNode) elt.parentNode.removeChild(elt);
  }
  function hideTooltip(tt) {
    if (!tt.parentNode) return;
    if (tt.style.opacity == null) rm(tt);
    tt.style.opacity = 0;
    setTimeout(function() { rm(tt); }, 600);
  }

  function showTooltipFor(e, content, node) {
    // remove any existing codemirror tooltips
    var tooltips = document.getElementsByClassName('CodeMirror-Tern-tooltip');
    while(tooltips.length)
      tooltips[0].parentNode.removeChild(tooltips[0]);

    var tooltip = showTooltip(e, content);
    function hide() {
      CodeMirror.off(node, "mouseout", hide);
      if (tooltip) { hideTooltip(tooltip); tooltip = null; }
    }
    var poll = setInterval(function() {
      if (tooltip) for (var n = node;; n = n.parentNode) {
        if (n == document.body) return;
        if (!n) { hide(); break; }
      }
      if (!tooltip) return clearInterval(poll);
    }, 400);
    CodeMirror.on(node, "mouseout", hide);
  }

  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------
  //--------------------------------------------------------------------------

  Espruino.Core.EditorJavaScript = {
    init : init,
    createNewEditor : createNewEditor, // see createNewEditor - returns an object. used by file.js
    getCode : () => { // get the code in the currently visible editor
      var ed = getVisibleEditor();
      return ed ? ed.getCode() : "";
    },
    getSelectedCode : () => { // get the currently highlighted bit of code
      var ed = getVisibleEditor();
      return ed ? ed.getSelectedCode() : "";
    },
    getCodeMirror : () => {
      console.warn("Using Espruino.Core.EditorJavaScript.getCodeMirror - deprecated");
      var ed = getVisibleEditor();
      if (!ed) return undefined;
      return ed.codeMirror
    },
    hideAll : () => {
      editors.forEach(editor => { if (editor.visible) editor.setVisible(false); });
    },
    getEditors : () => editors, // return list of current editors created with createNewEditor
    DEFAULT_CODE : "\n// ==== SCREEN VARIABLES ====\nconst SCREEN_WIDTH = 176;\nconst SCREEN_HEIGHT = 176;\n\nlet cx = SCREEN_WIDTH / 2,\n  cy = SCREEN_HEIGHT / 2;\n\nfunction startGame() {\n  g.clear();\n  \n  function Game() {\n    this.level = 1;\n    this.lastRender = null;\n    this.needsRender = true;\n  }\n\n  let game = new Game();\n\n  // ==== GAME VARIABLES ====\n  const gameSettings = {\n    MAP: {\n      TILE_SIZE: 16,\n      LAYOUT: [\n        [1, 1, 1, 1, 1, 1, 1, 1],\n        [1, 0, 0, 0, 0, 0, 0, 1],\n        [1, 0, 1, 1, 1, 0, 0, 1],\n        [1, 0, 1, 0, 1, 0, 0, 1],\n        [1, 0, 1, 0, 1, 0, 0, 1],\n        [1, 0, 0, 0, 0, 0, 0, 1],\n        [1, 0, 0, 0, 0, 0, 0, 1],\n        [1, 1, 1, 1, 1, 1, 1, 1],\n      ],\n    },\n    PLAYER: {\n      FOV: Math.PI / 4,\n      MAX_HEALTH: 10,\n      START: {\n        x: 2,\n        y: 2,\n      },\n    },\n  };\n  function Player() {\n    this.x = gameSettings.PLAYER.START.x * gameSettings.MAP.TILE_SIZE;\n    this.y = gameSettings.PLAYER.START.y * gameSettings.MAP.TILE_SIZE;\n    this.angle = 0;\n    this.health = gameSettings.PLAYER.MAX_HEALTH;\n    this.kills = 0;\n    this.lastHit = null;\n  }\n  let player = new Player();\n\n  function Zombie(x, y) {\n    this.x = x;\n    this.y = y;\n    this.baseSize = 20;\n    this.speed = 0.05;\n    this.health = 5;\n  }\n\n  function Hoard(n) {\n    let zombies = [];\n    for (let i = 0; i < n; i++) {\n      let x =\n          gameSettings.MAP.LAYOUT[0].length - Math.floor(1 + 3 * Math.random()),\n        y = gameSettings.MAP.LAYOUT.length - Math.floor(1 + 3 * Math.random());\n      zombies.push(\n        new Zombie(\n          x * gameSettings.MAP.TILE_SIZE,\n          y * gameSettings.MAP.TILE_SIZE\n        )\n      );\n    }\n    this.zombies = zombies;\n  }\n\n  // Zombies placed at world coordinates\n  let zombies = new Hoard(game.level).zombies;\n\n  // Move zombies toward the player\n  function moveZombies() {\n    zombies.forEach((zombie) => {\n      let dx = player.x - zombie.x;\n      let dy = player.y - zombie.y;\n      let dist = Math.sqrt(dx * dx + dy * dy);\n\n      if (dist > 0.5) {\n        // Only move if not already very close\n        dx /= dist; // Normalize direction vector\n        dy /= dist;\n        zombie.x += (dx * zombie.speed) / (Math.random() + 0.25); // Move zombie towards player\n        zombie.y += (dy * zombie.speed) / (Math.random() + 0.25);\n      } else {\n        if (new Date().getTime() - (player.lastHit || 0) > 500) {\n          player.health += -1;\n          g.setBgColor(\"#ff0000\").setColor(0).clear();\n          player.lastHit = new Date().getTime();\n        }\n      }\n    });\n  }\n  function zombieScreenData(zombie) {\n    let dx = zombie.x - player.x;\n    let dy = zombie.y - player.y;\n    let zombieAngle = Math.atan2(dy, dx);\n\n    let angleDifference = player.angle - zombieAngle;\n    angleDifference = ((angleDifference + Math.PI) % (2 * Math.PI)) - Math.PI;\n\n    if (Math.abs(angleDifference) <= gameSettings.PLAYER.FOV / 2) {\n      let dist = Math.sqrt(dx * dx + dy * dy);\n      if (dist < gameSettings.MAP.TILE_SIZE) dist = gameSettings.MAP.TILE_SIZE; // Prevent extreme scaling\n\n      let height = Math.min(\n        SCREEN_HEIGHT,\n        (gameSettings.MAP.TILE_SIZE * 0.9 * SCREEN_HEIGHT) / dist\n      );\n      let width = height / 3;\n      let screenX =\n        SCREEN_WIDTH / 2 + Math.tan(-angleDifference) * (SCREEN_WIDTH / 2);\n      let screenY =\n        SCREEN_HEIGHT / 2 +\n        Math.tan(angleDifference) / (SCREEN_HEIGHT / 2) +\n        400 / dist;\n\n      return {\n        x: screenX,\n        y: screenY,\n        height: height,\n        width: width,\n      };\n    }\n    return null;\n  }\n\n  function renderZombies() {\n    zombies.forEach((zombie) => {\n      let screen_data = zombieScreenData(zombie);\n      if (screen_data !== null) {\n        if (zombie.health > 0) {\n          g.setColor(0, 1, 0);\n        } else {\n          g.setColor(1, 0, 0);\n        }\n        const zombieTopY = screen_data.y - screen_data.height / 2,\n          zombieBottomY = screen_data.y + screen_data.height / 2,\n          zombieLeftX = screen_data.x - screen_data.width / 2,\n          zombieRightX = screen_data.x + screen_data.width / 2;\n\n        g.fillCircle(screen_data.x, zombieTopY - 20, 10);\n        g.setColor(1, 1, 1);\n        g.drawString(zombie.health, screen_data.x, zombieTopY - 30);\n        if (zombie.health > 0) {\n          g.setColor(0.12, 0.56, 0.12);\n        } else {\n          g.setColor(1, 0, 0);\n        }\n        g.fillRect(\n          zombieLeftX,\n          zombieTopY + (zombieBottomY - zombieTopY) / 4,\n          zombieRightX,\n          zombieBottomY - (zombieBottomY - zombieTopY) / 4\n        );\n        g.fillRect(\n          zombieLeftX + 10,\n          zombieTopY,\n          zombieRightX - 10,\n          zombieBottomY\n        );\n      }\n    });\n  }\n\n  function renderHUD() {\n    g.setColor(1, 0, 0);\n    g.setFont(\"Vector\", 20);\n    g.fillRect(40, SCREEN_HEIGHT - 40, SCREEN_WIDTH - 40, SCREEN_HEIGHT - 20);\n    g.setColor(0, 1, 0);\n    g.fillRect(\n      40,\n      SCREEN_HEIGHT - 40,\n      40 +\n        (SCREEN_WIDTH - 80) * (player.health / gameSettings.PLAYER.MAX_HEALTH),\n      SCREEN_HEIGHT - 20\n    );\n    g.setFont(\"Vector\", 10);\n    g.drawString(\"Zombies:\", 20, 20);\n    g.setFont(\"Vector\", 20);\n    g.drawString(zombies.length, 20, 30);\n\n    g.setFont(\"Vector\", 10);\n    g.drawString(`Level ${game.level}`, SCREEN_WIDTH / 2 - 10, 20);\n\n    g.setColor(1, 0, 0);\n    g.setFont(\"Vector\", 10);\n    g.drawString(\"Kills:\", SCREEN_WIDTH - 40, 20);\n    g.setFont(\"Vector\", 20);\n    g.drawString(player.kills, SCREEN_WIDTH - 40, 30);\n  }\n\n  function dist(x1, x2, y1, y2) {\n    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));\n  }\n\n  // ==== RAYCASTING FUNCTION ====\n  function castRayDist(angle) {\n    \"ram\"\n    let sinA = Math.sin(angle),\n      cosA = Math.cos(angle);\n    let x = player.x,\n      y = player.y;\n    while (true) {\n      x += cosA;\n      y += sinA;\n      if (\n        gameSettings.MAP.LAYOUT[Math.floor(y / gameSettings.MAP.TILE_SIZE)][\n          Math.floor(x / gameSettings.MAP.TILE_SIZE)\n        ] === 1\n      )\n        break;\n    }\n    return dist(x, player.x, y, player.y);\n  }\n\n  // ==== PLAYER MOVEMENT FUNCTION ====\n  function movePlayer(backward) {\n    let direction = backward ? -1 : 1;\n    let newX =\n      player.x +\n      ((Math.cos(player.angle) * gameSettings.MAP.TILE_SIZE) / 4) * direction;\n    let newY =\n      player.y +\n      ((Math.sin(player.angle) * gameSettings.MAP.TILE_SIZE) / 4) * direction;\n\n    // Wall collision check\n    if (\n      gameSettings.MAP.LAYOUT[Math.floor(newY / gameSettings.MAP.TILE_SIZE)][\n        Math.floor(newX / gameSettings.MAP.TILE_SIZE)\n      ] === 0\n    ) {\n      player.x = newX;\n      player.y = newY;\n      game.needsRender = true; // Mark for rendering\n    }\n  }\n\n  // ==== SHOOT FUNCTION ====\n  function shootGun() {\n    let bullets = [\n      {\n        x: cx,\n        y: SCREEN_HEIGHT,\n        size: 20,\n        speed: 2 + Math.random() * 2,\n        check_hit: true,\n      },\n    ];\n\n    function drawBullets() {\n      bullets.forEach((bullet, i) => {\n        g.setColor(1, 1, 1); // Background color\n        g.fillCircle(bullet.x, bullet.y, bullet.size); // Erase old bullet\n\n        // Update bullet position\n        if (bullet.y > cy) bullet.y -= bullet.speed;\n        bullet.size *= 0.9; // Shrink bullet\n\n        if (bullet.check_hit) {\n          // Collision detection with zombies\n          zombies.forEach((zombie, j) => {\n            let screen_data = zombieScreenData(zombie);\n            if (\n              bullet.check_hit &&\n              screen_data !== null &&\n              Math.abs(screen_data.x - cx) < 20\n            ) {\n              // Bullet hits zombie\n              zombie.health -= 1;\n              if (zombie.health < 0) {\n                return;\n              } else if (zombie.health == 0) {\n                player.kills += 1;\n                console.log(\"KILLED ZOMBIE\");\n                g.setColor(1, 0, 0);\n                g.drawString(\"KILL\", cx, cy);\n                setTimeout(() => zombies.splice(j, 1), 1000);\n              } else {\n                g.setColor(1, 0, 0);\n                g.drawString(\"HIT\", cx, cy);\n              }\n              bullet.check_hit = false; // Bullet disappears\n            }\n          });\n        }\n\n        // Stop rendering when bullet is too small\n        if (bullet.size < 2) {\n          bullets.splice(i, 1);\n        } else {\n          g.setColor(1, 0, 0); // Bullet color\n          g.fillCircle(bullet.x, bullet.y, bullet.size);\n        }\n      });\n\n      g.flip(); // Refresh screen\n    }\n\n    const bulletInterval = setInterval(drawBullets, 50);\n    setTimeout(() => clearInterval(bulletInterval), 1000)\n  }\n\n  function handleTouch(xy) {\n    const ROTATION = Math.PI / 16;\n    let x = xy.x,\n      y = xy.y;\n\n    if (x + y < cx + cy) {\n      // Top-left or top-right\n      if (x > y) {\n        // Top triangle (Forward)\n        movePlayer(true);\n      } else {\n        // Left triangle (Rotate left)\n        player.angle -= ROTATION;\n        game.needsRender = true;\n      }\n    } else {\n      // Bottom-left or bottom-right\n      if (x < y) {\n        // Bottom triangle (Backward)\n        movePlayer(false);\n      } else {\n        // Right triangle (Rotate right)\n        player.angle += ROTATION;\n        game.needsRender = true;\n      }\n    }\n  }\n\n  // ==== TOUCH INPUT HANDLING ====\n  Bangle.on(\"touch\", (t, xy) => {\n    console.log(\"Touch\");\n    handleTouch(xy);\n  });\n  Bangle.on(\"tap\", (xy) => {\n    console.log(\"Tap\");\n    handleTouch(xy);\n  });\n\n  // ==== RENDER FUNCTION ====\n  function render() {\n    \"ram\"\n    if (player.health <= 0) {\n      g.setBgColor(\"#000000\").setColor(0).clear();\n      g.setColor(1, 0, 0);\n      g.drawString(\"YOU DIED\", cx - 50, cy);\n      clearInterval(renderInterval);\n      return;\n    }\n\n    if (!game.needsRender) return; // Only render when needed\n    game.needsRender = false; // Reset flag\n    game.lastRender = new Date().getTime();\n\n    g.clear(); // Clear screen\n\n    // Draw sky\n    g.setColor(0, 0, 0);\n    g.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);\n\n    // Draw ground\n    g.setColor(0.5, 0.25, 0);\n    g.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT);\n\n    // Raycasting loop\n    for (let i = 0; i < SCREEN_WIDTH; i++) {\n      let angle =\n        player.angle -\n        gameSettings.PLAYER.FOV / 2 +\n        (i / SCREEN_WIDTH) * gameSettings.PLAYER.FOV;\n      let dist = castRayDist(angle);\n      let height = Math.min(\n        SCREEN_HEIGHT,\n        (gameSettings.MAP.TILE_SIZE * SCREEN_HEIGHT) / dist\n      );\n\n      // Optimized distance shading (avoids Math.pow)\n      let colorIndex = Math.floor(Math.max(0, 7 - dist * 0.25));\n      g.setColor(colorIndex / 7, colorIndex / 7, colorIndex / 7);\n\n      // Draw vertical wall slice\n      let startY = (SCREEN_HEIGHT - height) / 2;\n      g.fillRect(i, startY, i + 1, startY + height);\n    }\n    renderZombies();\n    renderHUD();\n\n    if (zombies.length == 0) {\n      g.setColor(0, 1, 0);\n      g.drawString(\"LEVEL SUCCESS\", cx - 80, cy);\n    }\n\n    g.flip(); // Update display\n  }\n\n  function setRenderInterval() {\n    return setInterval(() => {\n      moveZombies();\n      if (game.needsRender) {\n        render();\n      } else if (new Date().getTime() - game.lastRender > 500) {\n        game.needsRender = true;\n      }\n    }, 100);\n  }\n\n  // ==== GAME LOOP ====\n  let renderInterval = setRenderInterval();\n  render();\n\n  setWatch(\n    () => {\n      if (player.health > 0 && zombies.length > 0) {\n        shootGun();\n      } else {\n        if (zombies.length == 0) {\n          game.level += 1;\n          zombies = new Hoard(game.level).zombies;\n        }\n        player = new Player();\n        game.needsRender = true;\n        renderInterval = setRenderInterval();\n      }\n    },\n    BTN1,\n    { repeat: true }\n  );\n}\n\nfunction introAnim() {\n  g.setBgColor(\"#000000\").setColor(0).clear();\n  const W = g.getWidth();\n  const H = g.getHeight();\n\n  function Drip() {\n    this.x = Math.random() * W;\n    this.y = 0;\n    this.size = 2 + Math.random() * 3;\n    this.speed = 2 + Math.random() * 2;\n  }\n\n  let drips = [new Drip()];\n\n  function drawDrips() {\n    g.clear();\n    g.setColor(1, 0, 0); // Red color for blood\n\n    drips.forEach((drip, i) => {\n      g.fillCircle(drip.x, drip.y, drip.size);\n      drip.y += drip.speed;\n\n      // Add a smear effect for realism\n      g.fillRect(\n        drip.x - drip.size / 2,\n        drip.y - drip.size,\n        drip.x + drip.size / 2,\n        drip.y\n      );\n\n      // Reset if it reaches the bottom\n      if (drip.y > H) {\n        drips[i] = new Drip();\n      }\n    });\n    if (drips.length < 50) {\n      drips.push(new Drip());\n    }\n\n    g.flip();\n  }\n\n  // Run the animation\n  const dripInterval = setInterval(drawDrips, 50);\n  setWatch(\n    () => {\n      clearInterval(dripInterval);\n      startGame();\n    },\n    BTN1,\n    { repeat: false }\n  );\n}\n\nfunction titlePage() {\n  g.clear();\n  g.setFont(\"Vector\", 20);\n  g.setColor(0, 0, 0);\n  g.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);\n  g.setColor(1, 1, 1);\n  setTimeout(() => g.drawString(\"D\", cx - 60, cy), 500);\n  setTimeout(() => g.drawString(\"O\", cx - 40, cy), 1000);\n  setTimeout(() => g.drawString(\"O\", cx - 20, cy), 1500);\n  setTimeout(() => g.drawString(\"M\", cx, cy), 2000);\n  setTimeout(() => g.setFont(\"Vector\", 10), 2500);\n  setTimeout(() => g.drawString(\"(recreation)\", cx + 20, cy), 3000);\n  setTimeout(() => g.drawString(\"Harry Wixley 2025\", cx - 60, cy+40), 3000);\n\n  setWatch(\n    () => {\n      introAnim();\n    },\n    BTN1,\n    { repeat: false }\n  );\n}\n\ntitlePage();\n"
    };
}());
