
// 演算子列挙
const Operator = {
  ADD: "+",
  SUB: "-",
  MUL: "*",
  DIV: "÷",
  DOT: ".",
}

const Numbers = {
  ZERO: "0",
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
  NINE: "9",
}

const calculator = {
  displayNumbers: [],   // 式の表示用
  
  numberStats: [],   // 演算子の左の数字を一時格納する配列
  
  priorityFormula: [],   // 掛け算割り算の式を格納する配列
  
  nonPriorityFormula: [],   // 足し算引き算の式を格納する配列

  currentFormula: [],   // 正しい順序に整理された最終的な計算式

  // (0*-)の次に+を入力すると、(*+)になるので(*-)の時のみこの変数に
  // マイナスを一旦逃がして次の数値入力時(lastOperatorType)に確定させる
  demoOperator: null,

  lastOperatorType: null,   // 最後に入力された確定の演算子
 
  numberFlag: false,   // 数字か演算子かのフラグ

  set: function (item, newNumberFlag) {

    if (newNumberFlag) {
      //入力値が数字の場合の処理

      // 入力値が0だった時の制御
      if (item === Numbers.ZERO) {
        this.zeroChecker(item);
        return;
      }

      // 数列の先頭が0の場合は書き換える
      if (this.numberStats[0] === Numbers.ZERO) {
        this.displayNumbers.pop();
        this.displayNumbers.push(item);
        this.numberStats[0] = item;
      } else {
        this.displayNumbers.push(item);
        this.numberStats.push(item);
      }

      // 仮のマイナスがあれば確定する
      if (this.demoOperator) {
        this.lastOperatorType = this.demoOperator;
        this.demoOperator = null;
      }

      displayView();
      this.numberFlag = false;
    } else {
      // 入力値が演算子の場合の処理
      if ((this.lastOperatorType == item || this.demoOperator == item) && !this.displayLastIsNumber()) return;

      // 初期時の演算子制御
      if (this.displayNumbers.length == 0) {
        this.initialState(item);
        return;
      }

      // numberStatsを空にする
      this.numberStats.length = 0;
      console.log('演算子後' + this.numberStats);

      // 式の最後が演算子の場合の制御
      if (this.numberStats.length == 0) {
        this.checkOperatorType(item);
      }

      // *-のようなマイナスがなければ演算子を確定
      if (!this.demoOperator) {
        this.lastOperatorType = item;
      }
    }
  },

  clear: function() {
    this.displayNumbers.length = 0;
    this.numberStats.length = 0;
    this.priorityFormula.length = 0;
    this.nonPriorityFormula.length = 0;
    this.currentFormula.length = 0;
    this.demoOperator = null;
    this.lastOperatorType = null;
    this.numberFlag = false;
    resetView();
  },

  initialState: function(item) {
    // 初期状態ではマイナスの場合は0を入れずマイナスから始まる
    if (item == Operator.SUB) {
      this.displayNumbers.push(Operator.SUB);
      this.lastOperatorType = item;
      displayView();
    } else {
      // 初期状態ではマイナス以外は0を先に入れる
      this.displayNumbers.push("0");
      this.displayNumbers.push(item);
      this.lastOperatorType = item;
      displayView();
    }
  },

  checkOperatorType: function (item) {
    
    if (item == Operator.SUB) {
      // 入力値がマイナスの時の処理
      if (this.lastOperatorType == Operator.ADD) {
        // 最後の入力がプラスの場合はマイナスに置き換える
        this.operatorChange(item);
        displayView();
      } else {
        // 最後の入力値がプラス以外の時はそのまま表示
        if (!this.displayLastIsNumber()) {
          this.demoOperator = item;
        };
        this.displayNumbers.push(item);
        displayView();
      }
    } else {
      // (*-) この形なら演算子を2つ削除して書き換える
      if (this.demoOperator) {
        this.demoOperator = null;
        this.displayNumbers.splice(-2, 2);
        this.lastOperatorType = item;
        console.log("pop後" + this.displayNumbers.join);
        this.displayNumbers.push(item);
        displayView();
      } else {
        if (this.displayLastIsNumber()) {
          this.displayNumbers.push(item);
          displayView();
        } else {
          this.operatorChange(item);
          displayView();
        }
      }
    }
  },

  zeroChecker: function (zero) {
    const last = this.displayNumbers.length - 1;
    if (last < 0) return;
    
    // 最後が演算子なら0を表示
    if (!this.displayLastIsNumber()) {
      this.displayNumbers.push(zero);
      this.numberStats.push(zero);
      displayView();
    }

    // numberStateに0以外があれば0を入力可
    if (this.numberStats.length > 0) {
      let otherThanZero = -1;
      for (let i = 0; i < this.numberStats.length; i++) {
        if (this.numberStats[i] !== Numbers.ZERO) {
          otherThanZero = i;
          break;
        }
      }
      if (otherThanZero !== -1) {
        this.displayNumbers.push(zero);
        this.numberStats.push(zero);
        displayView();
      }
    }
  },

  operatorChange: function (item) {
    this.displayNumbers.pop();
    this.displayNumbers.push(item);
  },

  displayLastIsNumber: function () {
    const last = this.displayNumbers.length - 1;
    if (last < 0) return false; // 何も入ってなければ数字じゃない

    const v = this.displayNumbers[last];
    return (
      v !== Operator.ADD &&
      v !== Operator.SUB &&
      v !== Operator.MUL &&
      v !== Operator.DIV
    );
  }
}