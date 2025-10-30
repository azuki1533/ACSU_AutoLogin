// ==UserScript==
// @name         自動ログイン & 2段階認証 (信州大学) - 統合版
// @match        *://gakunin.ealps.shinshu-u.ac.jp/idp/Authn/External*
// @match        *://gakunin.ealps.shinshu-u.ac.jp/idp/profile/*
// @match        https://login.microsoftonline.com/*
// @version      3.0
// @description  信州大学ACSUのログイン、2段階認証、および途中で表示されるMicrosoft認証画面をすべて自動化します。
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const hostname = window.location.hostname;

    // =======================================================================
    // 1. 信州大学のページ用の処理
    // =======================================================================
    if (hostname.includes('shinshu-u.ac.jp')) {

        // --- 設定: ここに自分のアカウント情報をすべて入力してください ---
        const accounts = [
            // ▼ アカウントが1つの場合 (UIは表示されず、この情報で自動的に処理が進みます)
            // {
            //   name: 'アカウント名',
            //   username: 'dummy',
            //   password: 'dummy',
            //   matrixOrder: ["A", "B", "C", "D"] // イメージマトリックスの順番
            // },

            // ▼ アカウントが2つ以上の場合 (各ページでアカウント選択UIが表示されます)
            {
                name: 'アカウント名1',
                username: 'dummy1',
                password: 'dummy1',
                matrixOrder: ["A", "B", "C", "D"] // 1つ目のアカウントのアルファベット順
            },
            {
                name: 'アカウント名2',
                username: 'dummy2',
                password: 'dummy2',
                matrixOrder: ["A", "B", "C", "D"] // 2つ目のアカウントのアルファベット順
            },
        ];
        // -----------------------------------------------------------

        // --- 内部設定 (変更不要) ---
        const SESSION_STORAGE_KEY = 'shinshu_auto_login_selected_account';
        const LOGIN_UI_ID = 'shinshu-autologin-selector';
        const MATRIX_UI_ID = 'shinshu-matrix-selector';
        const clickDelay = 100;

        const alphabetToNumberMap = {
            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8, 'I': 9, 'J': 10,
            'K': 11, 'L': 12, 'M': 13, 'N': 14, 'O': 15, 'P': 16, 'R': 17, 'S': 18, 'T': 19,
            'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
        };

        // --- 関数定義 ---
        function attemptLogin(account) {
            const usernameField = document.querySelector('input[name="twuser"]') || document.getElementById('username');
            const passwordField = document.querySelector('input[name="twpassword"]') || document.getElementById('password');
            const loginButton = document.getElementById('login') || document.querySelector('button[name="_eventId_proceed"]');

            if (usernameField && passwordField && loginButton) {
                console.log(`[自動ログイン] ${account.name || account.username} でログインします。`);
                usernameField.value = account.username;
                passwordField.value = account.password;
                loginButton.click();
                return true;
            }
            return false;
        }

        function attemptMatrixLogin(order) {
            console.log(`[自動マトリックス認証] 順番 [${order.join(', ')}] で入力します。`);
            let allInputsSuccessful = true;

            order.forEach((alphabet, index) => {
                const imageNumber = alphabetToNumberMap[alphabet];
                if (!imageNumber) {
                    console.warn(`'${alphabet}' は不正なアルファベットです。`);
                    allInputsSuccessful = false;
                    return;
                }

                const imageButton = Array.from(document.querySelectorAll('.input_imgdiv_class'))
                    .find(b => b.style.backgroundImage.includes(`/imatrix/i${imageNumber}.gif`));
                if (!imageButton) {
                    console.warn(`'${alphabet}' のボタンが見つかりません。`);
                    allInputsSuccessful = false;
                    return;
                }

                const match = imageButton.getAttribute('onclick').match(/'(\d+)'/);
                if (!match || !match[1]) {
                    console.warn(`onclick属性から数字を抽出できませんでした。`);
                    allInputsSuccessful = false;
                    return;
                }

                const inputField = document.getElementById(`input_digit_${index}`);
                if (inputField) {
                    inputField.value = match[1];
                } else {
                    console.warn(`入力フィールド input_digit_${index} が見つかりません。`);
                    allInputsSuccessful = false;
                }
            });

            if (allInputsSuccessful) {
                const loginButton = document.getElementById('btnLogin');
                if (loginButton) {
                    setTimeout(() => loginButton.click(), clickDelay);
                } else {
                    console.warn('マトリックス認証のログインボタンが見つかりません。');
                }
            } else {
                console.error('マトリックス入力中にエラーが発生したため、ログインを中止します。');
            }
        }

        function createSelectorUI(options) {
            if (window.top !== window.self || document.getElementById(options.id)) {
                return;
            }
            const container = document.createElement('div');
            container.id = options.id;
            Object.assign(container.style, {
                position: 'sticky', top: '0', left: '0', width: '100%', zIndex: '9999',
                backgroundColor: options.backgroundColor, borderBottom: '1px solid #ccc',
                padding: '12px', boxSizing: 'border-box', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: '10px'
            });

            const title = document.createElement('p');
            title.textContent = options.title;
            Object.assign(title.style, { margin: '0', fontWeight: 'bold', fontSize: '14px', color: '#333' });
            container.appendChild(title);

            const buttonWrapper = document.createElement('div');
            Object.assign(buttonWrapper.style, { display: 'flex', gap: '8px' });

            accounts.forEach(account => {
                const button = document.createElement('button');
                button.textContent = account.name;
                Object.assign(button.style, {
                    padding: '6px 10px', border: `1px solid ${options.buttonBorderColor}`, borderRadius: '4px',
                    backgroundColor: options.buttonColor, color: 'white', cursor: 'pointer', fontSize: '14px'
                });
                button.onmouseover = () => {
                    button.style.backgroundColor = options.buttonHoverColor;
                };
                button.onmouseout = () => {
                    button.style.backgroundColor = options.buttonColor;
                };
                button.addEventListener('click', () => {
                    container.style.display = 'none';
                    options.onButtonClick(account);
                });
                buttonWrapper.appendChild(button);
            });

            container.appendChild(buttonWrapper);
            document.body.prepend(container);
        }

        function mainDispatcher() {
            // ID/パスワードのログインページか判定
            if (document.querySelector('input[name="twuser"], #username')) {
                console.log('[自動処理] ログインページを検出しました。');
                if (accounts.length > 1) {
                    createSelectorUI({
                        id: LOGIN_UI_ID, title: '自動ログイン:', backgroundColor: '#f0f4f8', buttonColor: '#007bff',
                        buttonHoverColor: '#0056b3', buttonBorderColor: '#005dab',
                        onButtonClick: (account) => {
                            sessionStorage.setItem(SESSION_STORAGE_KEY, account.name);
                            console.log(`[自動処理] アカウント「${account.name}」を記憶しました。`);
                            attemptLogin(account);
                        }
                    });
                } else {
                    attemptLogin(accounts[0]);
                }
                return true;
            }

            // イメージマトリックスのページか判定
            if (document.getElementById('btnLogin')) {
                console.log('[自動処理] イメージマトリックスページを検出しました。');
                const selectedAccountName = sessionStorage.getItem(SESSION_STORAGE_KEY);

                if (selectedAccountName && accounts.length > 1) {
                    console.log(`[自動処理] 記憶された「${selectedAccountName}」で自動認証します。`);
                    const selectedAccount = accounts.find(acc => acc.name === selectedAccountName);
                    if (selectedAccount) {
                        sessionStorage.removeItem(SESSION_STORAGE_KEY); // 使用後に削除
                        attemptMatrixLogin(selectedAccount.matrixOrder);
                    } else {
                        // 記憶された名前が見つからない場合のフォールバック
                        showMatrixSelectionUI();
                    }
                } else {
                    // 記憶がない場合（単一アカウント or 直接アクセス）
                    showMatrixSelectionUI();
                }
                return true;
            }

            return false;
        }

        function showMatrixSelectionUI() {
            if (accounts.length > 1) {
                createSelectorUI({
                    id: MATRIX_UI_ID, title: 'マトリックス認証:', backgroundColor: '#f8f0f0', buttonColor: '#dc3545',
                    buttonHoverColor: '#c82333', buttonBorderColor: '#a83232',
                    onButtonClick: (account) => attemptMatrixLogin(account.matrixOrder)
                });
            } else {
                attemptMatrixLogin(accounts[0].matrixOrder);
            }
        }

        // --- 実行ロジック ---
        if (!accounts || accounts.length === 0) {
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            if (mainDispatcher()) {
                obs.disconnect();
            }
        });

        if (!mainDispatcher()) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    // =======================================================================
    // 2. Microsoftのページ用の処理
    // =======================================================================
    else if (hostname.includes('microsoftonline.com')) {

        console.log('[自動処理] Microsoft 認証ページを検出しました。');

        const handleClick = () => {
            const submitButton = document.querySelector('input[type="submit"]');
            // ボタンが存在し、かつ画面に表示されているかを確認
            if (submitButton && submitButton.offsetParent !== null) {
                console.log('送信ボタンを発見。クリックします。');
                submitButton.click();
                return true; // クリック成功
            }
            return false; // ボタンが見つからない
        };

        // ページ読み込み完了時に一度試す
        if (handleClick()) {
            return;
        }

        // ボタンが動的に生成される場合のために監視を開始
        const observer = new MutationObserver((mutationsList, obs) => {
            if (handleClick()) {
                obs.disconnect(); // 目的を達成したので監視を停止
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }
})();