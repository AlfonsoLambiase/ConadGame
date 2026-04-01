/**
 * Parametri gameplay Colpo Vincente (lancio boccino, soglie, tempi).
 * Angoli: 0° = verso il fondo corsia (su schermo, -Y); tolleranza ±15° rispetto al su.
 */
export const ColpoVincenteGameplayConfig = {
  boccinoLaunchDelayMs: 450,
  boccinoLaunchAngleMinDeg: -15,
  boccinoLaunchAngleMaxDeg: 15,
  /** Modulo massimo velocità lancio boccino (world), sotto al cap della palla giocatore (speedBall 80). */
  boccinoMaxLaunchSpeed: 80,
  /**
   * Velocità **device-aware** del boccino al primo lancio automatico (world px/s circa, in base a Matter):
   * su schermi grandi serve più velocità per ottenere lo stesso effetto percepito.
   * (min = device piccolo tipo iPhone SE, max = device grande tipo iPhone 12 Pro)
   */
  boccinoAutoLaunchSpeedWorldMin: 15,
  boccinoAutoLaunchSpeedWorldMax: 120,
  /** Moltiplicatore sulla scala dinamica della palla giocatore. */
  boccinoScaleMul: 0.58,
  /**
   * Raggio collider `boccino` (cerchio Matter): `round(110 * boccinoPhysicsRadiusMul)`.
   * Stesso riferimento half-texture della palla; modifica qui per ridimensionare il collider.
   */
  boccinoPhysicsRadiusMul: 0.25,
  /** Cerchio arancione sovrapposto al collider del boccino (debug / tuning). */
  boccinoColliderDebugVisible: false, //! debug collider boccino, false disattivato.
  boccinoStoppedSpeedThreshold: 14,
  /** Soglia più stretta per la ball_player prima di mostrare di nuovo il bandierino (evita falsi positivi). */
  postShotPlayerStoppedSpeedThreshold: 3.5,
  boccinoStoppedSettleFrames: 12,
  /**
   * **Solo primo lancio automatico** (inizio match): fermata più lunga e lenta.
   * Dopo lo stop del boccino si usano i valori `boccinoMinRollingMs` / `boccinoRolling*` / `boccinoSoft*` sotto.
   */
  boccinoFirstAutoRollMinRollingMs: 900,
  boccinoFirstAutoRollRollingLerpSpeedThreshold: 56,
  boccinoFirstAutoRollRollingVelocityLerp: 0.038,
  boccinoFirstAutoRollStoppedSettleFrames: 20,
  boccinoFirstAutoRollSoftStopFrames: 140,
  boccinoFirstAutoRollSoftStopVelocityLerp: 0.078,
  boccinoFirstAutoRollSoftStopAngularLerp: 0.095,
  boccinoFirstAutoRollSoftStopCompleteSpeedThreshold: 0.028,
  /**
   * Dopo `boccinoMinRollingMs`, se 0 < |v| ≤ soglia, ogni frame la velocità viene interpolata verso 0
   * (`Phaser.Math.Linear`) oltre alla fisica Matter (default dopo il primo lancio auto).
   */
  boccinoRollingLerpSpeedThreshold: 36,
  /** Frazione verso 0 per frame nella fascia sopra (es. 0.08–0.12). */
  boccinoRollingVelocityLerp: 0.09,
  /**
   * Dopo `boccinoStoppedSettleFrames` sotto soglia: lerp verso 0 (non più damp moltiplicativo).
   * `boccinoSoftStopFrames` = limite massimo di sicurezza se |v| non scende abbastanza in tempo.
   */
  boccinoSoftStopFrames: 64,
  boccinoSoftStopVelocityLerp: 0.2,
  boccinoSoftStopAngularLerp: 0.22,
  /** Sotto questa |v| si azzera la velocità e si passa al turno giocatore. */
  boccinoSoftStopCompleteSpeedThreshold: 0.06,
  /** Non considerare “fermo” prima di questo tempo dal lancio (ms). */
  boccinoMinRollingMs: 520,
  /** Pausa dopo il bandierino prima di mostrare ball_player (ms). */
  delayMsAfterFlagBeforePlayer: 320,
  /** Dopo il tiro giocatore: non rivalidare “tutto fermo” prima di questo tempo (ms). */
  postShotFlagMinWaitMs: 280,
  /**
   * Dopo che boccino, palla giocatore e tutte le ball_enemy sono sotto soglia per `boccinoStoppedSettleFrames`,
   * attendi ancora questo tempo (ms) e rivalida prima di mostrare il bandierino.
   */
  postShotFlagExtraSettleDelayMs: 220,

  /** Max lanci ball_player per partita (icone sotto score). */
  maxPlayerShots: 3,
  /** Max lanci ball_enemy (stesso numero del giocatore, turni alterni). */
  maxEnemyShots: 3,
  /**
   * Moltiplicatore **device-aware** della potenza di lancio della IA (enemy).
   * Utile quando su schermi grandi la corsia “sembra più lunga” e l’IA non arriva / va lenta.
   */
  enemyLaunchPowerDeviceMulMin: 0.55,
  enemyLaunchPowerDeviceMulMax: 1.45,

  /**
   * Scia particelle dietro ball_player / ball_enemy in movimento (texture morbida generata in GameManager).
   */
  ballTrailEnabled: true,
  /** Depth emitter = depth palla − questo valore (scia dietro la sfera). */
  ballTrailDepthBehindBall: 2,
  /** |v| Matter sotto questa soglia: niente emissione (a riposo / quasi fermo). */
  ballTrailMinSpeedWorld: 8,
  /** Coda lunga = transizione più morbida (meno “taglio” netto). */
  ballTrailLifespanMs: 580,
  /**
   * Intervallo tra cicli di emissione (ms). **0** = un ciclo ogni frame (scia continua, meno “perline”).
   */
  ballTrailFrequencyMs: 0,
  /** Particelle per frame (frequency 0): più alto = nastro più pieno e fluido. */
  ballTrailQuantity: 5,
  /** Diametro visivo del “tampone” (texture 64px). */
  ballTrailScaleStart: 0.58,
  /** Fine vita: resta visibile un filo per continuità del nastro. */
  ballTrailScaleEnd: 0.1,
  /**
   * Opacità iniziale di ogni particella (fade verso 0 in vita).
   * Con blend **NORMAL** questo valore controlla davvero la trasparenza.
   * Con **ADD** / **SCREEN** molte particelle sovrapposte si sommano e la scia sembra quasi uguale al variare di questo numero.
   */
  ballTrailAlphaStart: 0.45,
  /**
   * `NORMAL` — alpha configurabile e prevedibile (consigliato).
   * `ADD` / `SCREEN` — effetto “luce” forte; poco sensibile a `ballTrailAlphaStart`.
   */
  ballTrailBlendMode: "NORMAL" as "NORMAL" | "ADD" | "SCREEN",
  /** Più saturi = scia più leggibile. */
  ballTrailTintPlayer: 0x4db8ff,
  ballTrailTintEnemy: 0xff7733,
  /** Jitter velocità (px/s): tenere ~0 per scia lungo la traiettoria, non “nuvola”. */
  ballTrailDriftMin: 0,
  ballTrailDriftMax: 0,
  /** Limite particelle vive per palla (scie lunghe). */
  ballTrailMaxParticles: 900,

  /**
   * Camera al lancio: zoom leggero subito, dopo `cameraShotPanDelayMs` pan verso l’alto (mondo Y−),
   * poi ritorno dolce all’ancora (lerp ogni frame).
   */
  cameraShotLaunchEnabled: true,
  cameraShotZoomMul: 1.55, //! Aumenta zoom 1.255
  cameraShotZoomLerp: 0.085,
  /** ms: solo zoom, ancora centrata; poi inizia il pan verso sopra. */
  cameraShotPanDelayMs: 100,
  /** Quanto spostare il centro camera verso l’alto corsia (pixel mondo). */
  cameraShotPanUpWorldPx: 50, //! Sale piu in alto lo zoom 38
  cameraShotPanLerp: 0.072,
  /** Durata massima fase “in” prima del ritorno (ms). */
  cameraShotInPhaseMaxMs: 2000, //! dura piu tempo lo zoom in zoomIn 850
  cameraShotReturnLerp: 0.065,
  cameraShotReturnEpsilonPx: 0.75,
  cameraShotReturnEpsilonZoom: 0.0035,

  /** ms: dissolvenza + rimpicciolimento icona munizione quando viene consumata al tiro. */
  shotChipConsumeEffectDurationMs: 280,
  /** Moltiplicatore scala finale sul valore corrente (0.35 ≈ si restringe fino al 35%). */
  shotChipConsumeEffectScaleEndMul: 0.35,

  /** Icona pannello score: pulse scala quando quel lato è più vicino al boccino (entrambi con almeno un tiro). */
  hudWinningIconPulseScaleMul: 1.2,
  hudWinningIconPulseDurationMs: 700,
  /** Tint “luce” sull’icona vincente nel pannello (quasi bianco-oro, molto visibile). */
  hudWinningIconTint: 0xfff8d0,
  /** Distanza HUD (m): sotto questa differenza = pareggio, nessun highlight. */
  hudWinningDistanceTieEpsilonM: 0.004,
  /** Pausa dopo il tiro giocatore prima che compaia la ball_enemy (ms). */
  delayMsAfterPlayerShotBeforeEnemyMs: 3000,
  /** Pausa dopo il tiro nemico prima della prossima ball_player / fine partita (ms). */
  nextPlayerBallSpawnDelayMs: 2000,
  /**
   * Fine partita: il testo risultato non compare prima di questo tempo dall’istante in cui l’IA
   * ha lanciato l’ultima ball_enemy. Se l’esito viene calcolato dopo, non si aspetta oltre.
   */
  colpoEndOverlayMinMsAfterLastEnemyLaunch: 2000,
  /** Dissolvenza + scorrimento verso il basso del testo risultato (ms). */
  colpoEndOverlayTextFadeDurationMs: 1000,
  /** Durata animazione freccia mira nemica (simula il tirare indietro). ~2s in più rispetto alla versione breve. */
  enemyAimSimulateDurationMs: 2650,
  /** Pull iniziale della freccia nemica (cresce fino al valore calcolato dall’IA). */
  enemyAimPullSimulateStart: 18,

  /**
   * Precisione IA nemica, **da 0 a 1** (consigliato ~0.45–0.85):
   * - **Più vicino a 1** → mira più centrata sul boccino, meno errore angolare, potenza e “pull” più stabili (nemico più forte).
   * - **Più vicino a 0** → jitter e dispersione al massimo (nemico più debole / casuale).
   * Il valore scala l’errore rispetto a `enemyAimMaxJitterDeg` e restringe l’intervallo di `enemyPowerMul*` / `enemyPull*`.
   */
  enemyAimPrecision: 0.88, //! Aumenta precisione dell'IA 0.78 – 0.88

  /** IA nemica: errore angolare massimo (± gradi) quando `enemyAimPrecision` = 0. Con precisione alta l’errore si riduce. */
  enemyAimMaxJitterDeg: 5, //! Aumenta dispersione dell'IA 5 – 10
  /** IA: moltiplicatore potenza sul tiro (random). */
  enemyPowerMulMin: 0.96, //! Aumenta potenza dell'IA 0.96
  enemyPowerMulMax: 1.1, //! Aumenta potenza dell'IA 1.10
  /** IA: “pull” virtuale slingshot prima del clamp potenza (come angolo puntatore). */
  enemyPullMin: 45, //! Aumenta pull dell'IA 35 - 55
  enemyPullMax: 165, //! Aumenta pull dell'IA 140 - 190

  /*
  Easy (umana imprecisa)
  enemyAimPrecision: 0.70–0.78
  enemyAimMaxJitterDeg: 9–14
  enemyPowerMulMin/Max: 0.94–1.12

  Normal (umana sensata)
  enemyAimPrecision: 0.80–0.88
  enemyAimMaxJitterDeg: 6–10
  enemyPowerMulMin/Max: 0.96–1.08

  Hard (umana brava, ancora non robot)
  enemyAimPrecision: 0.90–0.96
  enemyAimMaxJitterDeg: 3–6
  enemyPowerMulMin/Max: 0.98–1.05
  */

  /**
   * Distanza minima squadra (px, float): pareggio solo se |d_player − d_enemy| < ε.
   * Valore piccolo = vince la palla davvero più vicina; ε serve solo al rumore float/sub-pixel.
   */
  matchTieDistanceEpsilonPx: 0.5,

  /** Fisica ball_enemy (stessa famiglia della ball_player). */
  ballEnemyDensity: 0.0048,
  ballEnemyFriction: 0.024,
  ballEnemyFrictionStatic: 0.045,
  ballEnemyRestitution: 0.46,

  /**
   * HUD distanza: l’altezza dello schermo (in pixel) equivale a questa lunghezza in metri lungo la corsia.
   * `metri = distanzaPixel * (distanceHudMetersPerScreenHeight / scale.height)` — es. schermo intero in verticale ≈ 6 m.
   */
  distanceHudMetersPerScreenHeight: 27.5,

  /**
   * Raggio collider `ball_player` (cerchio Matter): `round(110 * ballPlayerPhysicsRadiusMul)`.
   * Stesso riferimento half-texture della palla; modifica qui per ridimensionare il collider.
   */
  ballPlayerPhysicsRadiusMul: 0.75,
  /** Cerchio verde sovrapposto al collider della ball_player (debug / tuning). */
  ballPlayerColliderDebugVisible: false, //! debug collider ball_player, false disattivato.
  /** Scala base sprite bandierino (prima della prospettiva in base alla distanza). */
  flagBaseScale: 1,
  /** SetDynamic: scala base bandierino (min=SE, max=12 Pro). */
  flagBaseScaleMin: 1,
  flagBaseScaleMax: 1.2,
  /** Moltiplicatore minimo bandierino quando è lontano in corsia. */
  flagPerspectiveMinMul: 0.42,
  /** SetDynamic: mul minimo bandierino in profondità (min=SE, max=12 Pro). */
  flagPerspectiveMinMulMin: 0.42,
  flagPerspectiveMinMulMax: 0.6,

  /**
   * Ordinamento depth in corsia: Y mondo maggiore (più in basso sullo schermo) → depth più alto (sopra).
   * `depth = clamp(base + y * perPixel + biasTipo, min, max)`. I bias servono se due oggetti hanno Y simile.
   */
  laneEntityDepthBase: 2,
  laneEntityDepthPerWorldPixel: 0.0035,
  laneEntityDepthMin: 1.5,
  laneEntityDepthMax: 11,
  laneDepthBiasBoccino: 0,
  laneDepthBiasBallEnemy: 0.025,
  laneDepthBiasBallPlayer: 0.045,
  /** Bandierino sopra al bersaglio quando condivide la stessa Y. */
  laneDepthBiasFlag: 0.065,
  /** Indicatore “palla più vicina al boccino”: sopra la palla in depth (stessa logica Y corsia). */
  laneDepthBiasClosestBallIndicator: 0.072,

  /**
   * Minimap corsia (HUD sotto le chip a sinistra): rettangolo = corsia in pianta.
   * `u` tra collider sinistro/destro alla Y della palla; `v` tra collider orizzontale di fondo e
   * altezza texture `bg_Top` (bordo “anteriore” / fondo schermo corsia).
   */
  /** Pannello ~1,5× rispetto alla versione precedente (min/max px scalati). */
  laneMinimapWidthPxMin: 147,
  laneMinimapWidthPxMax: 228,
  laneMinimapHeightPxMin: 198,
  laneMinimapHeightPxMax: 297,
  /** Sposta il pannello verso sinistra (px, scalato come gli altri HUD). */
  laneMinimapShiftLeftPxMin: 22,
  laneMinimapShiftLeftPxMax: 44,
  /** Margine interno su u,v in [0,1] così i pallini non toccano il bordo del pannello. */
  laneMinimapCameraEdgeEpsilon: 0.0015,
  laneMinimapInnerPaddingPx: 5,
  laneMinimapPanelBgAlpha: 0.58,
  laneMinimapPanelBorderAlpha: 0.62,
  laneMinimapDotRadiusPxMin: 7.8,
  laneMinimapDotRadiusPxMax: 12.6,
  laneMinimapOffsetBelowShotChipsPxMin: 8,
  laneMinimapOffsetBelowShotChipsPxMax: 16,
  laneMinimapColorBoccino: 0xfff6d6,
  laneMinimapColorPlayer: 0x4db8ff,
  laneMinimapColorEnemy: 0xff7733,

  /** PNG sopra la palla più vicina al boccino (ball_player in campo + nemiche). */
  closestBallIndicatorEnabled: true,
  /** Scala texture indicatore rispetto alla larghezza display della palla di riferimento. */
  ballIndicatorScaleMul: 0.42,
  /** Distanza extra in pixel mondo tra bordo superiore palla e pivot basso indicatore (origin 0.5,1). */
  ballIndicatorGapAboveBallPx: 6,

  /** Ombra ball_player: depth sotto la palla. */
  laneShadowDepthDelta: 0.04,
  /** Cerchi debug collider sopra la rispettiva palla. */
  laneColliderDebugDepthDelta: 0.008,
  /**
   * Freccia di mira **dietro** alle palle: valore positivo sottratto al depth della palla di riferimento
   * (Phaser: depth più basso = disegnato sotto / dietro).
   */
  laneAimArrowDepthBehindBall: 0.1,

  /** Palla giocatore più grande → più massa del boccino. */
  ballPlayerDensity: 0.0048,
  boccinoDensity: 0.0022,
  boccinoFriction: 0.055,
  boccinoFrictionStatic: 0.12,
  boccinoFrictionAir: 0.048,
  boccinoRestitution: 0.4,
  ballPlayerFriction: 0.024,
  ballPlayerFrictionStatic: 0.045,
  ballPlayerRestitution: 0.46,
} as const;
