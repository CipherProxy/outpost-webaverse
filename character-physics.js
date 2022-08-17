/* this is the character physics implementation.
it sets up and ticks the physics loop for our local character */

import * as THREE from 'three';
// import cameraManager from './camera-manager.js';
// import {getPlayerCrouchFactor} from './character-controller.js';
import physicsManager from './physics-manager.js';
// import ioManager from './io-manager.js';
import {getVelocityDampingFactor, applyVelocity} from './util.js';
import {groundFriction, flyFriction, airFriction, swimFriction, flatGroundJumpAirTime, jumpHeight} from './constants.js';
import {getRenderer, camera} from './renderer.js';
// import physx from './physx.js';
import metaversefileApi from 'metaversefile';

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3 = new THREE.Vector3();
const localVector4 = new THREE.Vector3();
const localVector5 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
// const localEuler = new THREE.Euler();
const localMatrix = new THREE.Matrix4();
const localVector2D = new THREE.Vector2();
const localVector2D2 = new THREE.Vector2();
const localVector2D3 = new THREE.Vector2();

// const localOffset = new THREE.Vector3();
// const localOffset2 = new THREE.Vector3();

// const localArray = [];
// const localVelocity = new THREE.Vector3();

const zeroVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const leftHandOffset = new THREE.Vector3(0.2, -0.2, -0.4);
const rightHandOffset = new THREE.Vector3(-0.2, -0.2, -0.4);
const z22Quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI/8);
const groundStickOffset = 0.03;

const physicsScene = physicsManager.getScene();

const CHARACTER_CONTROLLER_HEIGHT_FACTOR = 1.6;
class CharacterPhysics {
  constructor(character) {
    this.character = character;

    this.targetVelocity = new THREE.Vector3();
    this.lastTargetVelocity = new THREE.Vector3();
    this.wantVelocity = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.targetMoveDistancePerFrame = new THREE.Vector3();
    this.lastTargetMoveDistancePerFrame = new THREE.Vector3();
    this.wantMoveDistancePerFrame = new THREE.Vector3();
    // this.lastTimeDiff = 0; // todo:
    this.lastGrounded = null;
    this.lastGroundedTime = 0;
    this.lastCharacterControllerY = null;
    this.sitOffset = new THREE.Vector3();
    this.lastFallLoopAction = false;
    this.fallLoopStartTimeS = 0;
    this.lastGravityH = 0;

    this.lastPistolUse = false;
    this.lastPistolUseStartTime = -Infinity;
  }
  loadCharacterController(characterWidth, characterHeight) {
    this.characterWidth = characterWidth;
    this.characterHeight = characterHeight;

    const radius = (this.characterWidth / CHARACTER_CONTROLLER_HEIGHT_FACTOR) * this.characterHeight;
    const height = this.characterHeight - radius * 2;

    const contactOffset = (0.1 / CHARACTER_CONTROLLER_HEIGHT_FACTOR) * this.characterHeight;
    const stepOffset = (0.5 / CHARACTER_CONTROLLER_HEIGHT_FACTOR) * this.characterHeight;

    const position = this.character.position
      .clone()
      .add(new THREE.Vector3(0, -this.characterHeight / 2, 0));

    if (this.characterController) {
      physicsScene.destroyCharacterController(this.characterController);
      this.characterController = null;
    }
    this.characterController = physicsScene.createCharacterController(
      radius - contactOffset,
      height,
      contactOffset,
      stepOffset,
      position
    );
  }
  setPosition(p) {
    localVector.copy(p);
    localVector.y -= this.characterHeight * 0.5;
    physicsScene.setCharacterControllerPosition(
      this.characterController,
      localVector
    );
  }
  /* apply the currently held keys to the character */
  applyWasd(velocity, timeDiff) {
    // console.log('wasd')
    if (this.character.avatar) {
      this.targetVelocity.copy(velocity);
      window.domInfo.innerHTML += `<div style="display:;">targetVelocity: --- ${window.logVector3(this.targetVelocity)}</div>`;
      // window.visKeysDirectionX = keysDirection.x;
      // this.velocity.add(keysDirection);
      this.targetMoveDistancePerFrame.copy(this.targetVelocity).multiplyScalar(timeDiff / 1000);
      if (this.character === window.npcPlayer) if (this.targetMoveDistancePerFrame.x !== 0) debugger
      window.domInfo.innerHTML += `<div style="display:;">targetMoveDistancePerFrame: --- ${window.logVector3(this.targetMoveDistancePerFrame)}</div>`;
      // console.log(this.velocity.x, this.velocity.z)
      // window.visVelocityBeforeDampingX = this.velocity.x;
    }
  }
  applyGravity(nowS, timeDiffS) {
    // if (this.character) {
      const fallLoopAction = this.character.getAction('fallLoop');
      if (fallLoopAction) {
        if (!this.lastFallLoopAction) {
          // console.log('start fallLoop')
          this.fallLoopStartTimeS = nowS;
          this.lastGravityH = 0;
          if (fallLoopAction.from === 'jump') {
            const aestheticJumpBias = 1;
            const t = flatGroundJumpAirTime / 1000 / 2 + aestheticJumpBias;
            this.fallLoopStartTimeS -= t;
            const previousT = t - timeDiffS;
            this.lastGravityH = 0.5 * physicsScene.getGravity().y * previousT * previousT; // todo: consider xyz.
          }
        }
        const t = nowS - this.fallLoopStartTimeS;
        const h = 0.5 * physicsScene.getGravity().y * t * t; // todo: consider xyz.
        // this.velocity.y += h;
        this.wantMoveDistancePerFrame.y = h - this.lastGravityH;
        // console.log(this.wantMoveDistancePerFrame.y)
        // debugger
        // todo: this.wantVelocity.y = ???

        this.lastGravityH = h;
      }
      this.lastFallLoopAction = fallLoopAction;

      // if ((this.character.hasAction('jump') || this.character.hasAction('fallLoop')) && !this.character.hasAction('fly') && !this.character.hasAction('swim')) {
        
      //   const gravityTargetVelocity = localVector.copy(physicsScene.getGravity());
      //   const gravityTargetMoveDistancePerFrame = gravityTargetVelocity.multiplyScalar(timeDiffS);
      //   this.targetVelocity.add(gravityTargetVelocity); // todo: acceleration of gravity.
      //   this.targetMoveDistancePerFrame.add(gravityTargetMoveDistancePerFrame);

      //   //// move this.applyGravity(timeDiffS); after this.updateVelocity(timeDiffS);
      //   // const gravityVelocity = localVector.copy(physicsScene.getGravity());
      //   // const gravityMoveDistancePerFrame = gravityVelocity.multiplyScalar(timeDiffS);
      //   // this.velocity.add(gravityVelocity); // todo: acceleration of gravity.
      //   // this.wantMoveDistancePerFrame.add(gravityMoveDistancePerFrame);
      // }
    // }
  }
  updateVelocity(timeDiffS) {
    this.applyVelocityDamping(this.velocity, timeDiffS);
  }
  applyCharacterPhysicsDetail(velocityAvatarDirection, updateRig, now, timeDiffS) {
    if (this.character.avatar) {
      // console.log('apply avatar physics', this.character);
      // move character controller
      const minDist = 0;
      // localVector3.copy(this.velocity) // todo: rename?: this.velocity is not velocity, but move distance per frame now ?
      // if (this.character === window.npcPlayer) console.log(this.wantMoveDistancePerFrame.x)
      localVector3.copy(this.wantMoveDistancePerFrame)
        // .multiplyScalar(timeDiffS);
        // .multiplyScalar(timeDiffS);
        // .multiplyScalar(0.016);
      window.domInfo.innerHTML += `<div style="display:;">localVector3: --- ${window.logVector3(localVector3)}</div>`;

      // console.log('set localVector3')

      // aesthetic jump
      const jumpAction = this.character.getAction('jump');
      if (jumpAction?.trigger === 'jump') {
        const doubleJumpAction = this.character.getAction('doubleJump');
        if (doubleJumpAction) {
          const doubleJumpTime =
            this.character.actionInterpolants.doubleJump.get();
          localVector3.y =
            Math.sin(doubleJumpTime * (Math.PI / flatGroundJumpAirTime)) *
              jumpHeight +
            doubleJumpAction.startPositionY -
            this.lastCharacterControllerY;
          if (doubleJumpTime >= flatGroundJumpAirTime) {
            this.character.setControlAction({ type: 'fallLoop', from: 'jump' });
          }
        } else {
          const jumpTime = this.character.actionInterpolants.jump.get();
          localVector3.y =
            Math.sin(jumpTime * (Math.PI / flatGroundJumpAirTime)) *
              jumpHeight +
            jumpAction.startPositionY -
            this.lastCharacterControllerY;
          if (jumpTime >= flatGroundJumpAirTime) {
            this.character.setControlAction({ type: 'fallLoop', from: 'jump' });
          }
        }
      }

      // console.log('got local vector', this.velocity.toArray().join(','), localVector3.toArray().join(','), timeDiffS);
      if (
        this.character.hasAction('swim') &&
        this.character.getAction('swim').onSurface &&
        !this.character.hasAction('fly')
      ) {
        if (this.character.characterPhysics.velocity.y > 0) {
          localVector3.y = 0;
        }
      }

      // console.log('move')

      const positionXZBefore = localVector2D.set(this.characterController.position.x, this.characterController.position.z);
      const positionYBefore = this.characterController.position.y;
      const flags = physicsScene.moveCharacterController(
        this.characterController,
        localVector3,
        minDist,
        timeDiffS,
        this.characterController.position
      );
      const positionXZAfter = localVector2D2.set(this.characterController.position.x, this.characterController.position.z);
      const positionYAfter = this.characterController.position.y;
      const wantMoveDistancePerFrameXZ = localVector2D3.set(this.wantMoveDistancePerFrame.x, this.wantMoveDistancePerFrame.z);
      const wantMoveDistancePerFrameY = this.wantMoveDistancePerFrame.y;
      const wantMoveDistancePerFrameXZLength = wantMoveDistancePerFrameXZ.length();
      const wantMoveDistancePerFrameYLength = wantMoveDistancePerFrameY;
      this.velocity.copy(this.wantVelocity);
      if (wantMoveDistancePerFrameXZLength > 0) { // prevent divide 0, and reduce calculations.
        const movedRatioXZ = (positionXZAfter.sub(positionXZBefore).length()) / wantMoveDistancePerFrameXZLength;
        // console.log(movedRatioXZ.toFixed(2));
        // if (this.character === window.npcPlayer) debugger
        // if (movedRatioXZ < 1) this.velocity.multiplyScalar(movedRatioXZ); // todo: multiply targetVelocity.
        if (movedRatioXZ < 1) {
          this.velocity.x *= movedRatioXZ;
          this.velocity.z *= movedRatioXZ;
        }
      }
      if (wantMoveDistancePerFrameYLength > 0) { // prevent divide 0, and reduce calculations.
        const movedRatioY = (positionYAfter - positionYBefore) / wantMoveDistancePerFrameYLength;
        // console.log(movedRatioY)
        if (movedRatioY < 1) {
          this.velocity.y *= movedRatioY;
        }
      }

      // const collided = flags !== 0;
      let grounded = !!(flags & 0x1);

      if (
        !grounded &&
        !this.character.getAction('jump') &&
        !this.character.getAction('fly') &&
        !this.character.hasAction('swim')
      ) {
        // prevent jump when go down slope
        const oldY = this.characterController.position.y;
        const flags = physicsScene.moveCharacterController(
          this.characterController,
          localVector3.set(0, -groundStickOffset, 0),
          minDist,
          0,
          localVector4
        );
        const newGrounded = !!(flags & 0x1);
        if (newGrounded) {
          grounded = true;
          this.characterController.position.copy(localVector4);
        } else {
          this.characterController.position.y = oldY;
        }
      }

      this.characterController.updateMatrixWorld();
      this.characterController.matrixWorld.decompose(
        localVector,
        localQuaternion,
        localVector2
      );
      localQuaternion.copy(this.character.quaternion);
      localVector.y += this.characterHeight * 0.5;

      // capsule physics
      if (!this.character.hasAction('sit')) {
        // avatar facing direction
        if (velocityAvatarDirection) {
          const horizontalVelocity = localVector5.set(
            this.velocity.x,
            0,
            this.velocity.z
          );
          if (horizontalVelocity.lengthSq() > 0.001) {
            localQuaternion.setFromRotationMatrix(
              localMatrix.lookAt(zeroVector, horizontalVelocity, upVector)
            );
          }
        } else {
          localQuaternion.copy(camera.quaternion);
        }

        if (grounded) {
          this.lastGroundedTime = now;
          if (!this.lastGrounded) {
            if (
              this.character.hasAction('jump') ||
              this.character.hasAction('fallLoop')
            ) {
              this.character.setControlAction({
                type: 'land',
                time: now,
                isMoving: this.character.avatar.idleWalkFactor > 0,
              });
              this.character.removeAction('doubleJump');
            }
          }

          this.velocity.y = -1;
        } else {
          const lastGroundedTimeDiff = now - this.lastGroundedTime;
          if (lastGroundedTimeDiff > 200) {
            if (
              !this.character.hasAction('fallLoop') &&
              !this.character.hasAction('jump') &&
              !this.character.hasAction('fly') &&
              !this.character.hasAction('swim')
            ) {
              this.character.setControlAction({ type: 'fallLoop' });
              this.velocity.y = 0;
            }
          }
        }
      } else {
        //Outdated vehicle code
        this.velocity.y = 0;

        const sitAction = this.character.getAction('sit');

        const objInstanceId = sitAction.controllingId;
        const controlledApp =
          metaversefileApi.getAppByInstanceId(objInstanceId);

        const sitComponent = controlledApp.getComponent('sit');

        // Patch fix to fix vehicles and mounts for now
        let rideMesh = null;
        controlledApp.traverse((o) => {
          if (rideMesh === null && o.isSkinnedMesh) {
            rideMesh = o;
          }
        });

        // NOTE: We had a problem with sending the entire bone in the message buffer, so we're just sending the bone name
        const sitPos = sitComponent.sitBone
          ? rideMesh.skeleton.bones.find(
              (bone) => bone.name === sitComponent.sitBone
            )
          : controlledApp;
        const {
          sitOffset = [0, 0, 0],
          // damping,
        } = sitComponent;
        this.sitOffset.fromArray(sitOffset);

        applyVelocity(controlledApp.position, this.velocity, timeDiffS);
        if (this.velocity.lengthSq() > 0) {
          controlledApp.quaternion
            .setFromUnitVectors(
              localVector4.set(0, 0, -1),
              localVector5.set(this.velocity.x, 0, this.velocity.z).normalize()
            )
            .premultiply(
              localQuaternion2.setFromAxisAngle(
                localVector3.set(0, 1, 0),
                Math.PI
              )
            );
        }
        controlledApp.updateMatrixWorld();

        localMatrix
          .copy(sitPos.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);

        localVector.add(this.sitOffset);
        localVector.y += this.characterHeight * 0.5;

        physicsScene.setCharacterControllerPosition(
          this.characterController,
          localVector
        );
        localVector.y += this.characterHeight * 0.5;

        localQuaternion.premultiply(
          localQuaternion2.setFromAxisAngle(localVector3.set(0, 1, 0), Math.PI)
        );
      }
      // localOffset2.set(0, 0.05, 0); // Feet offset: Or feet will be in ground, only cosmetical, works for all avatars
      // localVector.add(localOffset2);
      localMatrix.compose(localVector, localQuaternion, localVector2);

      // apply to player
      if (updateRig) {
        this.character.matrix.copy(localMatrix);
      } else {
        this.character.matrix.identity();
      }
      this.character.matrix.decompose(
        this.character.position,
        this.character.quaternion,
        this.character.scale
      );
      this.character.matrixWorld.copy(this.character.matrix);

      // this.player.updateMatrixWorld();

      /* if (this.avatar) {
        if (this.player.hasAction('jump')) {
          this.avatar.setFloorHeight(-0xFFFFFF);
        } else {
          this.avatar.setFloorHeight(localVector.y - this.player.avatar.height);
        }
        this.avatar.updateMatrixWorld();
      } */

      this.lastGrounded = grounded;
      this.lastCharacterControllerY =
        this.characterController.position.y;
    }
  }
  /* dampen the velocity to make physical sense for the current avatar state */
  applyVelocityDamping(velocity, timeDiffS) {
    const doDamping = (factor) => {
      // console.log('damping')
      // const factor = getVelocityDampingFactor(groundFriction, timeDiff);
      // // const factor = getVelocityDampingFactor(window.aaa, timeDiff);
      // this.wantMoveDistancePerFrame.x = this.wantMoveDistancePerFrame.x * factor;
      // this.wantMoveDistancePerFrame.z = this.wantMoveDistancePerFrame.z * factor;

      this.wantMoveDistancePerFrame.x = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.x, this.lastTargetMoveDistancePerFrame.x, factor, timeDiffS);
      this.wantMoveDistancePerFrame.z = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.z, this.lastTargetMoveDistancePerFrame.z, factor, timeDiffS);
      // this.wantMoveDistancePerFrame.y = THREE.MathUtils.damp(this.wantMoveDistancePerFrame.y, this.lastTargetMoveDistancePerFrame.y, factor, timeDiffS);
      this.wantMoveDistancePerFrame.y = this.targetMoveDistancePerFrame.y;
      // if (this.targetMoveDistancePerFrame.x > 0) debugger
      // if (this.character === window.npcPlayer) if (this.wantMoveDistancePerFrame.x !== 0) debugger

      this.wantVelocity.x = THREE.MathUtils.damp(this.wantVelocity.x, this.lastTargetVelocity.x, factor, timeDiffS);
      this.wantVelocity.z = THREE.MathUtils.damp(this.wantVelocity.z, this.lastTargetVelocity.z, factor, timeDiffS);
      // this.wantVelocity.y = THREE.MathUtils.damp(this.wantVelocity.y, this.lastTargetVelocity.y, factor, timeDiffS);
      this.wantVelocity.y = this.targetVelocity.y;
      // this.velocity.x = this.targetVelocity.x;
      // this.velocity.z = this.targetVelocity.z;

      // const testMoveDistancePerFrameX = this.velocity.x * timeDiffS;
      // const testMoveDistancePerFrameZ = this.velocity.z * timeDiffS;
      // const testMoveDistancePerFrameY = this.velocity.y * timeDiffS;

      // console.log(
      //   // this.wantMoveDistancePerFrame.x === testMoveDistancePerFrameX ? 0 : (this.wantMoveDistancePerFrame.x > testMoveDistancePerFrameX ? 1 : 2),
      //   // Math.abs(this.wantMoveDistancePerFrame.x - testMoveDistancePerFrameX) < 1e-6 ? 0 : Math.abs(this.wantMoveDistancePerFrame.x - testMoveDistancePerFrameX),
      //   Math.abs(this.wantMoveDistancePerFrame.x - testMoveDistancePerFrameX) < 1e-6 ? 0 : (this.wantMoveDistancePerFrame.x > testMoveDistancePerFrameX ? 1 : 2),
      //   // '-',
      //   // this.wantMoveDistancePerFrame.z, testMoveDistancePerFrameZ,
      //   // '-',
      //   // this.wantMoveDistancePerFrame.y, testMoveDistancePerFrameY,
      // )

      // console.log('damping')

      // this.velocity.copy(this.lastTargetMoveDistancePerFrame).divideScalar(timeDiffS)
      // console.log(Math.round(this.velocity.length()))

      // this.velocity.copy(this.wantMoveDistancePerFrame).divideScalar(timeDiffS)
      // console.log((this.velocity.length()))
    }
    if (this.character.hasAction('fly')) {
      // const factor = getVelocityDampingFactor(flyFriction, timeDiff);
      // velocity.multiplyScalar(factor);
      doDamping(flyFriction);
    } 
    else if(this.character.hasAction('swim')){
      // const factor = getVelocityDampingFactor(swimFriction, timeDiff);
      // velocity.multiplyScalar(factor);
      doDamping(swimFriction);
    }
    else {
      doDamping(groundFriction);
    }
  }
  applyCharacterPhysics(now, timeDiffS) {
    // const renderer = getRenderer();
    // const session = renderer.xr.getSession();

    /* if (session) {
      if (ioManager.currentWalked || this.player.hasAction('jump')) {
        // const originalPosition = avatarWorldObject.position.clone();

        this.applyAvatarPhysicsDetail(false, false, now, timeDiffS);

        // dolly.position.add(
          // avatarWorldObject.position.clone().sub(originalPosition)
        // );
      } else {
        // this.velocity.y = 0;
      }
    } else { */
    if (
      this.character.hasAction('firstperson') ||
      (this.character.hasAction('aim') && !this.character.hasAction('narutoRun'))
    ) {
      this.applyCharacterPhysicsDetail(false, true, now, timeDiffS);
    } else {
      this.applyCharacterPhysicsDetail(true, true, now, timeDiffS);
    }
    // }
  }
  applyCharacterActionKinematics(now, timeDiffS) {
    const renderer = getRenderer();
    const session = renderer.xr.getSession();
    const aimAction = this.character.getAction('aim');
    const aimComponent = (() => {
      for (const action of this.character.getActions()) {
        if (action.type === 'wear') {
          const app = this.character.appManager.getAppByInstanceId(
            action.instanceId
          );
          if (!app) {
            return null;
          }
          for (const { key, value } of app.components) {
            if (key === 'aim') {
              return value;
            }
          }
        }
      }
      return null;
    })();
    const useAction = this.character.getAction('use');

    const _updateHandsEnabled = () => {
      const isSession = !!session;
      const isPlayerAiming = !!aimAction && !aimAction.playerAnimation;
      const isObjectAimable = !!aimComponent;
      // const isPlayingEnvelopeIkAnimation = !!useAction && useAction.ik === 'bow';
      const isHandEnabled =
        isSession ||
        (isPlayerAiming &&
          isObjectAimable); /* && !isPlayingEnvelopeIkAnimation */
      for (let i = 0; i < 2; i++) {
        const isExpectedHandIndex =
          i ===
          (aimComponent?.ikHand === 'left'
            ? 1
            : aimComponent?.ikHand === 'right'
            ? 0
            : null);
        const enabled = isHandEnabled && isExpectedHandIndex;
        this.character.hands[i].enabled = enabled;
      }
    };
    _updateHandsEnabled();

    const _updateFakeHands = () => {
      if (!session) {
        localMatrix
          .copy(this.character.matrixWorld)
          .decompose(localVector, localQuaternion, localVector2);

        const avatarHeight = this.character.avatar ? this.characterHeight : 0;
        const handOffsetScale = this.character.avatar ? avatarHeight / 1.5 : 1;
        if (this.character.hands[0].enabled) {
          const leftGamepadPosition = localVector2
            .copy(localVector)
            .add(
              localVector3
                .copy(leftHandOffset)
                .multiplyScalar(handOffsetScale)
                .applyQuaternion(localQuaternion)
            );
          const leftGamepadQuaternion = localQuaternion;
          /* const leftGamepadPointer = 0;
          const leftGamepadGrip = 0;
          const leftGamepadEnabled = false; */

          this.character.leftHand.position.copy(leftGamepadPosition);
          this.character.leftHand.quaternion.copy(leftGamepadQuaternion);
        }
        if (this.character.hands[1].enabled) {
          const rightGamepadPosition = localVector2
            .copy(localVector)
            .add(
              localVector3
                .copy(rightHandOffset)
                .multiplyScalar(handOffsetScale)
                .applyQuaternion(localQuaternion)
            );
          const rightGamepadQuaternion = localQuaternion;
          /* const rightGamepadPointer = 0;
          const rightGamepadGrip = 0;
          const rightGamepadEnabled = false; */

          this.character.rightHand.position.copy(rightGamepadPosition);
          this.character.rightHand.quaternion.copy(rightGamepadQuaternion);
        }
      }
    };
    _updateFakeHands();

    const _updatePistolIkAnimation = () => {
      const kickbackTime = 300;
      const kickbackExponent = 0.05;
      const fakeArmLength = 0.2;

      const pistolUse = !!useAction && useAction.ik === 'pistol';
      // console.log('got use action', !!pistolUse, useAction?.ik);
      if (!this.lastPistolUse && pistolUse) {
        this.lastPistolUseStartTime = now;
      }
      this.lastPistolUse = pistolUse;

      if (isFinite(this.lastPistolUseStartTime)) {
        const lastUseTimeDiff = now - this.lastPistolUseStartTime;
        const f = Math.min(Math.max(lastUseTimeDiff / kickbackTime, 0), 1);
        const v = Math.sin(Math.pow(f, kickbackExponent) * Math.PI);
        localQuaternion.setFromRotationMatrix(
          localMatrix.lookAt(
            localVector.copy(this.character.leftHand.position),
            localVector2
              .copy(this.character.leftHand.position)
              .add(
                localVector3
                  .set(0, 1, -1)
                  .applyQuaternion(this.character.leftHand.quaternion)
              ),
            localVector3
              .set(0, 0, 1)
              .applyQuaternion(this.character.leftHand.quaternion)
          )
        );

        this.character.leftHand.position.sub(
          localVector
            .set(0, 0, -fakeArmLength)
            .applyQuaternion(this.character.leftHand.quaternion)
        );

        this.character.leftHand.quaternion.slerp(localQuaternion, v);

        this.character.leftHand.position.add(
          localVector
            .set(0, 0, -fakeArmLength)
            .applyQuaternion(this.character.leftHand.quaternion)
        );

        this.character.leftHand.updateMatrixWorld();

        if (f >= 1) {
          this.lastPistolUseStartTime = -Infinity;
        }
      }
    };
    _updatePistolIkAnimation();

    const _updateBowIkAnimation = () => {
      const bowUse = !!useAction && useAction.ik === 'bow';
      // console.log('got use action', !!pistolUse, useAction?.ik);
      if (!this.lastBowUse && bowUse) {
        this.lastBowUseStartTime = now;
      }
      if (!bowUse) {
        this.lastBowUseStartTime = -Infinity;
      }
      this.lastBowUse = bowUse;

      if (isFinite(this.lastBowUseStartTime)) {
        const lastUseTimeDiff = now - this.lastBowUseStartTime;
        // const fakeArmLength = 0.2;

        const v = Math.min(Math.max(lastUseTimeDiff / 300, 0), 1);

        const targetPosition = localVector
          .copy(this.character.rightHand.position)
          .add(
            localVector2
              .set(-rightHandOffset.x * 2, 0, -0.2)
              .applyQuaternion(this.character.rightHand.quaternion)
          );
        const targetQuaternion = localQuaternion
          .copy(this.character.rightHand.quaternion)
          .multiply(z22Quaternion);

        this.character.rightHand.position.lerp(targetPosition, v);
        this.character.rightHand.quaternion.slerp(targetQuaternion, v);

        /* this.player.rightHand.quaternion.slerp(localQuaternion, v);
        this.player.rightHand.position.add(
          localVector.set(0, 0, -fakeArmLength)
            .applyQuaternion(this.player.rightHand.quaternion)
        ); */

        this.character.rightHand.updateMatrixWorld();
      }
    };
    _updateBowIkAnimation();
  }
  update(now, timeDiffS) {
    const nowS = now / 1000;
    this.updateVelocity(timeDiffS);
    this.applyGravity(nowS, timeDiffS);
    this.applyCharacterPhysics(now, timeDiffS);
    this.applyCharacterActionKinematics(now, timeDiffS);

    // console.log('update end')
    this.lastTargetVelocity.copy(this.targetVelocity);
    this.lastTargetMoveDistancePerFrame.copy(this.targetMoveDistancePerFrame);
  }
  reset() {
    if (this.character.avatar) {
      this.velocity.set(0, 0, 0);
    }
  }
  destroy() {
    // nothing
  }
}

export {
  CharacterPhysics,
};
