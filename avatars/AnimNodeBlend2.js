import {MathUtils} from 'three';
import {AnimMixer} from './AnimMixer';
import {AnimNode} from './AnimNode';

class AnimNodeBlend2 extends AnimNode {
  constructor(name, mixer) {
    super(name, mixer);
    this.isAnimNodeBlend2 = true;
    this.factor = 0;

    this.isCrossFade = false;
    this.crossFadeDuration = 0;
    this.crossFadeTargetFactor = 0;
    this.crossFadeStartTime = 0;
  }

  addChild(node) {
    this.children.push(node);
  }

  update(spec) {
    // if (spec.isPosition && this === window.avatar?.jumpNode) console.log(this.isCrossFade);
    // if (spec.isPosition && this === window.avatar?.jumpNode) console.log(timeS);
    // if (spec.isPosition && this === window.avatar?.jumpNode) console.log(this.factor);

    // do fade
    if (this.isCrossFade) {
      this.factor = (AnimMixer.timeS - this.crossFadeStartTime) / this.crossFadeDuration;
      this.factor = MathUtils.clamp(this.factor, 0, 1);
      if (this.crossFadeTargetFactor === 0) {
        this.factor = 1 - this.factor;
      }
      if (this.factor === this.crossFadeTargetFactor) this.isCrossFade = false;
    }
    this.children[0].weight = 1 - this.factor;
    this.children[1].weight = this.factor;

    // do blend
    // const value0 = this.mixer.doBlend(this.children[0], spec);
    // const value1 = this.mixer.doBlend(this.children[1], spec);
    // const result = [];
    // AnimMixer.copyArray(result, value0);
    // AnimMixer.interpolateFlat(result, result, value1, this.factor);

    const result = this.doBlendList(spec);
    return result;
  }

  crossFade(duration, targetFactor) { // targetFactor only support 0 | 1 now
    this.isCrossFade = true;
    this.crossFadeDuration = duration;
    this.crossFadeTargetFactor = targetFactor;
    this.crossFadeStartTime = AnimMixer.timeS;
  }
}

export {AnimNodeBlend2};