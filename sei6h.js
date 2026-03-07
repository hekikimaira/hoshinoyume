// ===== せいの6時間 Pack v0.1 =====
// Pack commands:
//   PACK:sei6h:title:defaultImg:flag1=img1:flag2=img2
//   PACK:sei6h:kanojo:start
//   PACK:sei6h:kanojo:end
//   PACK:sei6h:quiz:start:N:badEndLabel
//   PACK:sei6h:quiz:peek
//   PACK:sei6h:quiz:end
//   PACK:sei6h:route:label6h:label12h:label3h

registerPack('sei6h', {

    _state: {
        kanojoMode: false,
        quizActive: false,
        menuPeekCount: 0,
        menuPeekLimit: 0,
        badEndLabel: ''
    },

    onCommand(args, context) {
        const sub = (args[0] || '').toLowerCase();
        switch (sub) {
            case 'title': return this.showTitle(args.slice(1), context);
            case 'kanojo': return this.handleKanojo(args.slice(1), context);
            case 'quiz': return this.handleQuiz(args.slice(1), context);
            case 'route': return this.showRouteSelect(args.slice(1), context);
            default:
                console.warn('sei6h: unknown sub-command:', sub);
                context.resolve(null);
        }
    },

    // ========================================
    // タイトル画面
    // フラグに応じて画像を切り替え
    // args: [defaultImg, "flag1=img1", "flag2=img2", ...]
    // 後ろのフラグほど優先（最後にマッチしたものが表示）
    // ========================================
    showTitle(args, context) {
        const overlay = context.overlay;
        const defaultImg = args[0] || '';
        let displayImg = defaultImg;

        // フラグチェック（後ろ優先）
        for (let i = 1; i < args.length; i++) {
            const [flag, img] = (args[i] || '').split('=');
            if (flag && img && context.getFlag(flag)) {
                displayImg = img;
            }
        }

        // 画像URL解決（imageBlobs, charBlobs, overlayBlobsから探す）
        const imgUrl = this._resolveImage(displayImg, context);

        overlay.innerHTML = `
            <div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;">
                ${imgUrl ? `<img src="${imgUrl}" style="max-width:100%;max-height:85%;object-fit:contain;user-select:none;">` :
                    `<div style="font-size:28px;font-weight:900;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.3);">${displayImg || 'せいの6時間'}</div>`}
                <div style="position:absolute;bottom:40px;color:#666;font-size:13px;animation:sei6h-blink 1.5s ease-in-out infinite;">タップして開始</div>
            </div>
            <style>
                @keyframes sei6h-blink { 0%,100%{opacity:0.3} 50%{opacity:1} }
            </style>
        `;

        overlay.querySelector('div').onclick = () => {
            context.resolve(null);
        };
    },

    // ========================================
    // 彼女の視点モード（回想演出）
    // start: セピア＋ビネット＋フレームを適用、フラグセット
    // end: 解除
    // ========================================
    handleKanojo(args, context) {
        const action = (args[0] || '').toLowerCase();
        const previewCanvas = document.querySelector('.preview-mode.active .preview-canvas') ||
                              document.querySelector('#previewCanvas');

        if (action === 'start') {
            this._state.kanojoMode = true;
            context.setFlag('kanojo_mode');

            // 回想用スタイル挿入
            let styleEl = document.getElementById('sei6h-kanojo-style');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'sei6h-kanojo-style';
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                .preview-canvas.kanojo-mode {
                    filter: sepia(0.4) contrast(0.95) brightness(0.95);
                }
                .preview-canvas.kanojo-mode::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
                    pointer-events: none;
                    z-index: 50;
                }
                .preview-canvas.kanojo-mode .text-display .char-name::before {
                    content: '🌸 ';
                }
            `;

            if (previewCanvas) previewCanvas.classList.add('kanojo-mode');

            // 即座に解決（ブロックしない）
            context.resolve(null);

        } else if (action === 'end') {
            this._state.kanojoMode = false;

            if (previewCanvas) previewCanvas.classList.remove('kanojo-mode');

            const styleEl = document.getElementById('sei6h-kanojo-style');
            if (styleEl) styleEl.textContent = '';

            context.resolve(null);

        } else {
            context.resolve(null);
        }
    },

    // ========================================
    // クイズ（質問ゲーム）区間
    // start:N:badLabel — 開始。メニューN回覗いたらbadLabelへ強制移行
    // peek — メニュー覗き。N回超えたら強制バッドエンド
    // end — 区間終了、カウンターリセット
    // ========================================
    handleQuiz(args, context) {
        const action = (args[0] || '').toLowerCase();

        if (action === 'start') {
            this._state.quizActive = true;
            this._state.menuPeekCount = 0;
            this._state.menuPeekLimit = parseInt(args[1]) || 3;
            this._state.badEndLabel = args[2] || '';
            console.log(`sei6h quiz: started, limit=${this._state.menuPeekLimit}, badEnd=${this._state.badEndLabel}`);
            context.resolve(null);

        } else if (action === 'peek') {
            if (!this._state.quizActive) {
                context.resolve(null);
                return;
            }

            this._state.menuPeekCount++;
            const count = this._state.menuPeekCount;
            const limit = this._state.menuPeekLimit;

            console.log(`sei6h quiz: peek ${count}/${limit}`);

            if (count >= limit) {
                // 強制バッドエンド
                this._state.quizActive = false;
                this._state.menuPeekCount = 0;

                const overlay = context.overlay;
                overlay.innerHTML = `
                    <div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                        <div style="color:#e94560;font-size:20px;font-weight:900;letter-spacing:4px;text-shadow:0 0 20px rgba(233,69,96,0.5);animation:sei6h-deadend 0.5s ease-out;">
                            ……見すぎた
                        </div>
                    </div>
                    <style>
                        @keyframes sei6h-deadend {
                            0% { opacity:0; transform:scale(2); }
                            100% { opacity:1; transform:scale(1); }
                        }
                    </style>
                `;

                setTimeout(() => {
                    if (this._state.badEndLabel) {
                        context.resolve({ goto: this._state.badEndLabel });
                    } else {
                        context.resolve(null);
                    }
                }, 2000);

            } else {
                // 警告演出（残り回数に応じて濃くなる）
                const intensity = count / limit;
                const overlay = context.overlay;
                overlay.innerHTML = `
                    <div style="position:absolute;inset:0;background:rgba(233,69,96,${0.1 + intensity * 0.2});pointer-events:none;animation:sei6h-warn 0.8s ease-out forwards;">
                    </div>
                    <style>
                        @keyframes sei6h-warn {
                            0% { opacity:1; } 100% { opacity:0; }
                        }
                    </style>
                `;
                setTimeout(() => {
                    overlay.innerHTML = '';
                    context.resolve(null);
                }, 800);
            }

        } else if (action === 'end') {
            this._state.quizActive = false;
            this._state.menuPeekCount = 0;
            console.log('sei6h quiz: ended');
            context.resolve(null);

        } else {
            context.resolve(null);
        }
    },

    // ========================================
    // ルート選択画面
    // args: [label6h, label12h, label3h]
    //
    // フラグ:
    //   route_12h_unlocked — 12時間解禁
    //   route_3h_unlocked  — 3時間解禁
    //
    // ロジック:
    //   6h選択時 → route_12h_unlocked があれば消す
    //   12h選択時 → そのまま
    //   3h選択時 → そのまま
    // ========================================
    showRouteSelect(args, context) {
        const label6h = args[0] || '';
        const label12h = args[1] || '';
        const label3h = args[2] || '';
        const has12h = context.getFlag('route_12h_unlocked');
        const has3h = context.getFlag('route_3h_unlocked');
        const overlay = context.overlay;

        const routes = [
            { name: 'せいの6時間', label: label6h, available: true, color: '#4ecdc4' }
        ];
        if (has12h) {
            routes.push({ name: 'せいの12時間', label: label12h, available: true, color: '#ff6b6b' });
        }
        if (has3h) {
            routes.push({ name: 'せいの3時間', label: label3h, available: true, color: '#ffa502' });
        }

        overlay.innerHTML = `
            <div style="position:absolute;inset:0;background:linear-gradient(180deg,#0a0a0a 0%,#111 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">
                <div style="font-size:14px;color:#666;letter-spacing:3px;margin-bottom:20px;">ルートを選択</div>
                ${routes.map((r, i) => `
                    <button class="sei6h-route-btn" data-idx="${i}" style="
                        width:260px; padding:18px 24px;
                        background:linear-gradient(135deg, ${r.color}22 0%, ${r.color}11 100%);
                        border:2px solid ${r.color}66;
                        border-radius:8px; cursor:pointer;
                        font-size:16px; font-weight:900; color:${r.color};
                        font-family:inherit;
                        transition:all 0.2s;
                        text-shadow:0 0 10px ${r.color}44;
                    ">${r.name}</button>
                `).join('')}
            </div>
            <style>
                .sei6h-route-btn:hover {
                    transform: scale(1.05);
                    filter: brightness(1.3);
                }
                .sei6h-route-btn:active {
                    transform: scale(0.98);
                }
            </style>
        `;

        overlay.querySelectorAll('.sei6h-route-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = +btn.dataset.idx;
                const route = routes[idx];
                if (!route) return;

                // 6h選択時: 12h解禁フラグを消す
                if (route.label === label6h && has12h) {
                    // flags からフラグ削除
                    delete context.flags['route_12h_unlocked'];
                    console.log('sei6h route: 12h flag cleared (chose 6h after 12h unlock)');
                }

                if (route.label) {
                    context.resolve({ goto: route.label });
                } else {
                    context.resolve(null);
                }
            };
        });
    },

    // ========================================
    // ヘルパー: 画像URL解決
    // ========================================
    _resolveImage(filename, context) {
        if (!filename) return null;
        if (context.charBlobs[filename]) return context.charBlobs[filename].url;
        if (context.imageBlobs[filename]) return context.imageBlobs[filename].url;
        if (context.overlayBlobs[filename]) return context.overlayBlobs[filename].url;
        return null;
    }
});
