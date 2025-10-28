// ASCIIに統一
const TOK = {
  ADD: '+',
  SUB: '-',
  MUL: '*',
  DIV: '/',
  DOT: '.',
  EQ:  '=',
};

const calculator = {
  state: 'start',
  dotSeen: false,
  displayNumbers: [],
  numberStats: [],      // 現在の数値トークン
  sum: 0,
  term: null,
  addSign: +1,
  numberSign: +1, // 単項マイナス
  mulOp: null,

  // 初期化
  clear: function() {
    this.state = 'start';
    this.dotSeen = false;
    this.displayNumbers = [];
    this.numberStats = [];
    this.sum = 0;
    this.term = null;
    this.addSign = +1;
    this.numberSign = +1;
    this.mulOp = null;
    resetView();
  },

  // -------------------- FSM --------------------
  // 分類
  kindOf(ch) {
    if (ch >= '0' && ch <= '9') return 'digit';
    if (ch === '.') return 'dot';
    if (ch === '+' || ch === '-') return 'opAddSub';
    if (ch === '*' || ch === '/') return 'opMulDiv';
    if (ch === '=') return 'equals';
    return 'other';
  },

  // 許可表
  ALLOW: {
    start:         new Set(['digit', 'dot', 'opAddSub', 'opMulDiv']),
    inNumber:      new Set(['digit','dot','opAddSub','opMulDiv','equals']),
    afterOperator: new Set(['digit', 'dot', 'opAddSub', 'opMulDiv']),
    afterEquals:   new Set(['digit','dot','opAddSub','opMulDiv','equals']),
  },

  // バリデーション
  accept(kind) {
    if (!this.ALLOW[this.state].has(kind)) return false;
    if (kind === 'dot' && this.dotSeen) return false;
    return true;
  },

  set(token) {
    const kind = this.kindOf(token);
    if (!this.accept(kind)) return;

    const handlers = {
      digit:    (token) => this.handleDigit(token),
      dot:           () => this.handleDot(),
      opAddSub: (token) => this.handleOperator(token),
      opMulDiv: (token) => this.handleOperator(token),
      equals: ()        => this.handleEquals(),
    }

    // ディスパッチ
    handlers[kind]?.(token);
    console.log('合計値', this.sum);
    // 描画
    displayView();
  },
  // ---------------------------------------------


  // ---------- handleメソッド ----------
  handleDigit(token) {

    this.beginNewExpressionIfAfterEquals();

    const starting = this.isAtExpressionStart(); 

    // 先頭ゼロの扱い（小数点なしの場合だけ 0 を上書き）
    const isJustZero = 
      this.numberStats.length === 1 && this.numberStats[0] === '0' && !this.dotSeen;

    // ケース例:
    //  - 0 → 6         => 6
    //  - 0 → + → 0 → 6 => 0+6
    //  - 0 → . → 6     => 0.6

    // 先頭に0があり0以外の数値が入力されたら置き換える
    if (isJustZero && token !== '0') {

      const last = this.peekLast();
      if (last && last >= '0' && last <= '9') {
        this.displayNumbers.pop(); // 数字のときだけ消す
      }

      this.displayNumbers.push(token);
      this.numberStats[0] = token;
      this.state = 'inNumber';
      return;
    }

    if (token === '0') {
      if (starting) {
        // 0から開始
        this.ensureLeadingZero();   // 先頭に0を追加
        this.state = 'inNumber';
        return;
      }

      if (isJustZero && token === '0') {
        return;
      }
    }

    this.displayNumbers.push(token);
    this.numberStats.push(token);
    this.state = 'inNumber';
  },

  handleDot() {
    if (this.dotSeen) return;
    this.dotSeen = true;
    this.beginNewExpressionIfAfterEquals();
    if (this.numberStats.length === 0) {
      this.ensureLeadingZero();   // 先頭 '.' → '0.' に
    }
    this.displayNumbers.push(TOK.DOT);
    this.numberStats.push(TOK.DOT);
    this.state = 'inNumber';
  },

  handleOperator(op) {
    // 連打禁止
    if (this.peekLast() === op) return;

    // イコール後に演算子が押された場合の処理
    if (this.state === 'afterEquals') {
      console.log('イコール後', this.term);
      const value = this.sum;
      this.numberSign = +1;
      this.dotSeen = false;

      if (op === TOK.MUL || op === TOK.DIV) {
        this.sum = 0;
        this.term = value;
        this.mulOp = op;
      } else {
        this.sum = value;
        this.term = null;             
        this.addSign = (op === TOK.ADD) ? +1 : -1;
      }
      this.displayNumbers.push(op);
      this.state = 'afterOperator';
      return;
    }

    // 式の最初に演算子が入力された時の処理
    if (this.isAtExpressionStart()) {
      if (op === TOK.SUB) {
        // 入力値がマイナスなら単項マイナスとして記録する
        this.numberSign = -1;
        this.displayNumbers.push(op);
        this.state = 'afterOperator';
        return;
      }

      if (op === TOK.ADD) {
        // 入力値がプラスなら表示だけ 0 を補い、numberStats は空にして開始待ち
        this.displayNumbers.push('0');
        this.numberStats = [];
        this.dotSeen = false;
        this.displayNumbers.push(op);
        this.addSign = +1;
        this.state = 'afterOperator';
        return;
      }

      if (op === TOK.MUL || op === TOK.DIV) {
        console.log(this.displayNumbers.join(""));
        // 表示は 0* / 0÷、内部は「term=0」に確定してから mulOp を立てる
        this.displayNumbers.push('0');
        this.numberStats = ['0'];   // 一時的に 0 を数として積む
        const v = this.finalizeNumber();
        this.onValue(v);
        this.mulOp = op;
        this.displayNumbers.push(op);
        this.numberStats = [];
        this.state = 'afterOperator';
        return;
      }
    }

    if (this.state === 'inNumber') {
      const v = this.finalizeNumber();
      if (v != null) this.onValue(v);
    }

    // 演算子の直後に演算子が入力された時の処理
    if (this.state === 'afterOperator') {
      if (op === TOK.SUB) {
        if (this.peekLast() === TOK.ADD) {
          this.displayNumbers.pop();
          this.displayNumbers.push(op);
          return;
        } else {
          this.numberSign = -1;
          this.displayNumbers.push(op);
          return;
        }
      } else {
        if (!this.isAtExpressionStart() && this.numberSign === -1) {
          // 単項マイナスがある場合(例: 2*-)この場合は演算子を二つ消去
          this.displayNumbers.splice(-2, 2);
          this.numberSign = +1;
        } else {
          this.displayNumbers.pop();
        }
      }
    }

    // 乗除は「term に畳み込む準備」だけ
    if (op === TOK.MUL || op === TOK.DIV) {
      this.displayNumbers.push(op);
      this.mulOp = op;
      this.state = 'afterOperator';
      return;
    }

    // 二項 +/-
    // term が溜まっていれば sum に合流（addSign で加減）
    if (this.term != null) {
      this.sum += this.addSign * this.term;
      this.term = null;
    }

    this.displayNumbers.push(op);
    this.addSign = (op === TOK.ADD) ? +1 : -1;
    this.state = 'afterOperator';
  },

  handleEquals() {
    if (this.isAtExpressionStart() || this.state === 'afterOperator') return;

    if (this.state === 'inNumber') {
      const v = this.finalizeNumber();
      if (v != null) this.onValue(v);
    }

    if (this.term != null) {
      this.sum += this.addSign * this.term;
      this.term = null;
    }

    const result = this.sum;

    this.displayNumbers = [String(result)];
    this.state = 'afterEquals';
    this.dotSeen = false;
    this.numberSign = +1;
    this.addSign = +1;
    this.mulOp = null;
    this.numberStats = [];

    return result;
  },


  // ---------- ヘルパメソッド(カプセル)状態は書き換えない ----------

  // 乗算の畳み込み
  onValue(v) {
    if (this.mulOp == null) {
      this.term = v;
    } else {
      this.term = (this.mulOp === TOK.MUL)
        ? (this.term * v)
        : (this.term / v);
      this.mulOp = null;
    }
  },

  // 数値トークン確定
  finalizeNumber() {
    if (this.numberStats.length === 0) return null;
    const num = parseFloat(this.numberStats.join("")); //数値化
    const signed = (num === 0 ? 0 : this.numberSign * num); // 単項マイナス適応
    this.numberStats = [];
    this.dotSeen = false;
    this.numberSign = +1;
    return signed;
  },

  // 式の先頭かを返す
  isAtExpressionStart() {
    return this.state === 'start' || this.displayNumbers.length === 0;
  },

  // 先頭に '0' を差し込む
  ensureLeadingZero() {
    const needZero = this.isAtExpressionStart() || this.dotSeen === true;
    if (!needZero) return false;

    // 既に 0 を開始済みなら何もしない
    const alreadyZero = 
      this.numberStats.length === 1 && this.numberStats[0] === '0';
    
    if (!alreadyZero) {
      this.displayNumbers.push('0');
      // "開始する" ので置き換えで統一（重複防止）
      this.numberStats = ['0'];
    }
    return true;
  },

  // 最後に入力された値を取得する
  peekLast() {
    const arr = this.displayNumbers;
    return arr.length ? arr[arr.length - 1] : undefined;
  },

  // 最後の値を入れ替える
  changeLast(op) {
    this.displayNumbers.pop();
    this.displayNumbers.push(op);
  },

  // イコールの後に数値orドットの場合は新たな式として始める
  beginNewExpressionIfAfterEquals() {
    if (this.state === 'afterEquals') {
      this.state = 'start';
      this.displayNumbers = [];
      this.numberStats = [];
      this.sum = 0;
      this.term = null;
      this.addSign = +1;
      this.numberSign = +1;
      this.mulOp = null;
      this.dotSeen = false;
    }
  }
}




function resetView() {
  $('#display').text('0');
}

function displayView() {
  $('#display').text(calculator.displayNumbers.join(""));
}

// ---------- number key ----------

$('#zero').on('click', function () {
  calculator.set('0');
});

$('#one').on('click', function () {
  calculator.set('1');
});

$('#two').on('click', function () {
  calculator.set('2');
});

$('#three').on('click', function () {
  calculator.set('3');
});

$('#four').on('click', function () {
  calculator.set('4');
});

$('#five').on('click', function () {
  calculator.set('5');
});

$('#six').on('click', function () {
  calculator.set('6');
});

$('#seven').on('click', function () {
  calculator.set('7');
});

$('#eight').on('click', function () {
  calculator.set('8');
});

$('#nine').on('click', function () {
  calculator.set('9');
});

// ---------- operator ----------

$('#clear').on('click', function () {
  calculator.clear();
});

$('#plus').on('click', function () {
  calculator.set(TOK.ADD);
});

$('#minus').on('click', function () {
  calculator.set(TOK.SUB);
});

$('#times').on('click', function () {
  calculator.set(TOK.MUL);
});

$('#divide').on('click', function () {
  calculator.set(TOK.DIV);
});

$('#dot').on('click', function () {
  calculator.set(TOK.DOT);
});

$('#equals').on('click', function () {
  calculator.set(TOK.EQ);
});