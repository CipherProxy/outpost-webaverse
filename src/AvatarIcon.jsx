import React, { useEffect, useRef, useContext, useState } from 'react';
import classnames from 'classnames';
import { AppContext } from './components/app';
import {world} from '../world.js';
import styles from './AvatarIcon.module.css';
import {PlaceholderImg} from './PlaceholderImg.jsx';
import { playersManager } from '../players-manager.js';
import { AvatarIconer } from '../avatar-iconer.js';
import cameraManager from '../camera-manager.js'
import * as sounds from '../sounds.js'

const characterIconSize = 100;
const pixelRatio = window.devicePixelRatio;

const CharacterIcon = () => {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const localPlayer = playersManager.getLocalPlayer();
      const avatarIconer = new AvatarIconer(localPlayer, {
        width: characterIconSize * pixelRatio,
        height: characterIconSize * pixelRatio,
      });
      avatarIconer.addCanvas(canvas);

      const frame = () => {
        if (avatarIconer.enabled) {
          avatarIconer.update();
        }
      };
      world.appManager.addEventListener('frame', frame);

      const enabledchange = e => {
        setLoaded(e.data.enabled);
      };
      avatarIconer.addEventListener('enabledchange', enabledchange);

      return () => {
        avatarIconer.destroy();
        world.appManager.removeEventListener('frame', frame);
        avatarIconer.removeEventListener('enabledchange', enabledchange);
      };
    }
  }, [canvasRef]);

  return (
      <div
        className={classnames(
          styles.characterIcon,
          loaded ? styles.loaded : null,
        )}
        onMouseEnter={e => {
          sounds.playSoundName('menuClick');
        }}
      >
          <div className={styles.main}>
              <canvas
                className={styles.canvas}
                width={characterIconSize * pixelRatio}
                height={characterIconSize * pixelRatio}
                ref={canvasRef}
              />
              <PlaceholderImg className={styles.placeholderImg} />
              <div className={styles.meta}>
                  <div className={styles.text}>
                      <div className={styles.background} />
                      <span className={styles.name}>Outpost Noob</span>
                  </div>
              </div>
          </div>
          <div className={styles.sub}>
              <div className={styles.buttonWrap}>
                  <div className={styles.button}>Tab</div>
              </div>
          </div>
      </div>
  );
};

export const AvatarIcon = ({ className }) => {
    const { state, setState } = useContext( AppContext );

    const handleCharacterBtnClick = () => {

        setState({ openedPanel: ( state.openedPanel === 'CharacterPanel' ? null : 'CharacterPanel' ) });

        if ( state.openedPanel === 'CharacterPanel' ) {

            cameraManager.requestPointerLock();

        }

    };

    return (
        <div
            className={ classnames( className, styles.avatarIcon ) }
            onClick={handleCharacterBtnClick}
        >
            {/* <a href="/" className={styles.logo}>
                <img src="images/arrow-logo.svg" className={styles.image} />
            </a> */}
            <CharacterIcon />
        </div>
    );
};
