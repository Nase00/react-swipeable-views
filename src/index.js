import React from 'react';
import ReactDOM from 'react-dom';
import {Motion, spring} from 'react-motion';

const styles = {
  root: {
    overflowX: 'hidden',
  },
  container: {
    display: '-webkit-box; display: flex',
  },
  slide: {
    width: '100%',
    flexShrink: 0,
    overflow: 'auto',
  },
};

const RESISTANCE_COEF = 0.7;

class SwipeableViews extends React.Component {

  static propTypes = {
    /**
     * Use this property to provide your slides.
     */
    children: React.PropTypes.node.isRequired,

    /**
     * This is the inlined style that will be applied
     * to each slide container.
     */
    containerStyle: React.PropTypes.object,

    /**
     * If true, it will disable touch events.
     * This is useful when you want to prohibit the user from changing slides.
     */
    disabled: React.PropTypes.bool,

    /**
     * This is the index of the slide to show.
     * This is useful when you want to change the default slide shown.
     * Or when you have tabs linked to each slide.
     */
    index: React.PropTypes.number,

    /**
     * This is callback prop. It's call by the
     * component when the shown slide change after a swipe made by the user.
     * This is useful when you have tabs linked to each slide.
     */
    onChangeIndex: React.PropTypes.func,

    /**
     * This is callback prop. It's called by the
     * component when the slide switching.
     * This is useful when you want to implement something corresponding to the current slide position.
     */
    onSwitching: React.PropTypes.func,

    /**
     * If true, it will add bounds effect on the edges.
     */
    resistance: React.PropTypes.bool,

    /**
     * This is the inlined style that will be applied
     * on the slide component.
     */
    slideStyle: React.PropTypes.object,

    /**
     * This is the inlined style that will be applied
     * on the root component.
     */
    style: React.PropTypes.object,

    /**
     * This is the threshold used for detecting a quick swipe.
     * If the computed speed is above this value, the index change.
     */
    threshold: React.PropTypes.number,
  };

  static defaultProps = {
    index: 0,
    threshold: 5,
    resistance: false,
    disabled: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      indexCurrent: props.index,
      indexLatest: props.index,
      isDragging: false,
      isFirstRender: true,
      heightLatest: 0,
    };
  }

  componentDidMount() {
    this.setState({
      isFirstRender: false,
    });
  }

  componentWillReceiveProps(nextProps) {
    const {
      index,
    } = nextProps;

    if (typeof index === 'number' && index !== this.props.index) {
      this.setState({
        indexCurrent: index,
        indexLatest: index,
      });
    }
  }

  handleTouchStart = (event) => {
    const touch = event.touches[0];

    this.startWidth = ReactDOM.findDOMNode(this).getBoundingClientRect().width;
    this.indexStart = this.state.indexCurrent;
    this.startX = touch.pageX;
    this.lastX = touch.pageX;
    this.vx = 0;
    this.startY = touch.pageY;
    this.isScrolling = undefined;
  };

  handleTouchMove = (event) => {
    const touch = event.touches[0];

    // This is a one time test
    if (this.isScrolling === undefined) {
      this.isScrolling = Math.abs(this.startY - touch.pageY) > Math.abs(this.startX - touch.pageX) ||
       event.defaultPrevented;
    }

    if (this.isScrolling) {
      return;
    }

    // Prevent native scrolling
    event.preventDefault();

    this.vx = this.vx * 0.5 + (touch.pageX - this.lastX) * 0.5;
    this.lastX = touch.pageX;

    const indexMax = React.Children.count(this.props.children) - 1;

    let index = this.indexStart + (this.startX - touch.pageX) / this.startWidth;

    if (!this.props.resistance) {
      // Reset the starting point
      if (index < 0) {
        index = 0;
        this.startX = touch.pageX;
      } else if (index > indexMax) {
        index = indexMax;
        this.startX = touch.pageX;
      }
    } else {
      if (index < 0) {
        index = Math.exp(index * RESISTANCE_COEF) - 1;
      } else if (index > indexMax) {
        index = indexMax + 1 - Math.exp((indexMax - index) * RESISTANCE_COEF);
      }
    }

    this.setState({
      isDragging: true,
      indexCurrent: index,
    }, () => {
      if (this.props.onSwitching) {
        this.props.onSwitching(index);
      }
    });
  };

  handleTouchEnd = () => {
    if (this.isScrolling) {
      return;
    }

    let indexNew;

    // Quick movement
    if (Math.abs(this.vx) > this.props.threshold) {
      if (this.vx > 0) {
        indexNew = Math.floor(this.state.indexCurrent);
      } else {
        indexNew = Math.ceil(this.state.indexCurrent);
      }
    } else {
      // Some hysteresis with indexStart
      if (Math.abs(this.indexStart - this.state.indexCurrent) > 0.6) {
        indexNew = Math.round(this.state.indexCurrent);
      } else {
        indexNew = this.indexStart;
      }
    }

    const indexMax = React.Children.count(this.props.children) - 1;

    if (indexNew < 0) {
      indexNew = 0;
    } else if (indexNew > indexMax) {
      indexNew = indexMax;
    }

    const indexLatest = this.state.indexLatest;

    this.setState({
      indexCurrent: indexNew,
      indexLatest: indexNew,
      isDragging: false,
    }, () => {
      if (this.props.onSwitching) {
        this.props.onSwitching(indexNew);
      }

      if (this.props.onChangeIndex && indexNew !== indexLatest) {
        this.props.onChangeIndex(indexNew, indexLatest);
      }
    });
  };

  updateHeight(node, index) {
    if (node !== null && index === this.state.indexLatest) {
      const child = node.children[0];
      if (child !== undefined && this.state.heightLatest !== child.clientHeight) {
        this.setState({
          heightLatest: child.clientHeight,
        });
      }
    }
  }

  renderContainer(interpolatedStyle, updateHeight, childrenToRender) {
    const {
      containerStyle,
    } = this.props;

    const translate = -interpolatedStyle.translate;

    const styleNew = {
      WebkitTransform: `translate3d(${translate}%, 0, 0)`,
      transform: `translate3d(${translate}%, 0, 0)`,
    };

    if (updateHeight) {
      styleNew.height = interpolatedStyle.height;
    }

    return (
      <div style={Object.assign(styleNew, styles.container, containerStyle)}>
        {childrenToRender}
      </div>
    );
  }

  render() {
    const {
      /* eslint-disable no-unused-vars */
      index,
      onChangeIndex,
      onSwitching,
      resistance,
      threshold,
      /* eslint-enable no-unused-vars */
      children,
      containerStyle,
      slideStyle,
      disabled,
      style,
      ...other,
    } = this.props;

    const {
      indexCurrent,
      isDragging,
      isFirstRender,
      heightLatest,
    } = this.state;

    const translate = indexCurrent * 100;

    const height = heightLatest;

    const motionStyle = isDragging ? {
      translate: translate,
      height: height,
    } : {
      translate: spring(translate, {
        stiffness: 300,
        damping: 30,
      }),
      height: height !== 0 ? spring(height, {
        stiffness: 300,
        damping: 30,
      }) : 0,
    };

    const touchEvents = disabled ? {} : {
      onTouchStart: this.handleTouchStart,
      onTouchMove: this.handleTouchMove,
      onTouchEnd: this.handleTouchEnd,
    };

    let updateHeight = true;
    // There is no point to animate if we already provide a height
    if (containerStyle && (containerStyle.height || containerStyle.maxHeight || containerStyle.minHeight)) {
      updateHeight = false;
    }

    const slideStyleObj = Object.assign({}, styles.slide, slideStyle);

    const childrenToRender = React.Children.map(children, (child, index2) => {
      if (isFirstRender && index2 > 0) {
        return null;
      }

      let ref;

      if (updateHeight) {
        ref = (node) => this.updateHeight(node, index2);
      }

      return (
        <div ref={ref} style={slideStyleObj}>
          {child}
        </div>
      );
    });

    return (
      <div
        {...other}
        style={Object.assign({}, styles.root, style)}
        {...touchEvents}
      >
        <Motion style={motionStyle}>
          {(interpolatedStyle) => this.renderContainer(interpolatedStyle, updateHeight, childrenToRender)}
        </Motion>
      </div>
    );
  }
}

export default SwipeableViews;
